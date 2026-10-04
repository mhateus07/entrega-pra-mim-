import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin, serverError } from '@/lib/auth-helpers'
import { jsonResponse } from '@/lib/json-response'
import { LABELS_STATUS_PEDIDO, LABELS_TIPO_SERVICO } from '@/utils/helpers'
import { LABELS_METODO_PAGAMENTO } from '@/lib/pagamentos'
import type { MetodoPagamento, StatusPedido, TipoServico } from '@prisma/client'

const DIA_MS = 86_400_000
// São Paulo não tem horário de verão desde 2019: deslocamento fixo de -3h.
const OFFSET_MS = 3 * 3_600_000
const PERIODOS = [7, 30, 90] as const
const ATRASO_MINUTOS = 15

const local = (d: Date) => new Date(d.getTime() - OFFSET_MS)
const chaveDia = (d: Date) => local(d).toISOString().slice(0, 10)

function variacao(atual: number, anterior: number) {
  return { atual, anterior }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.authenticated) return auth.response
  try {
    const diasParam = Number(request.nextUrl.searchParams.get('dias'))
    const dias = (PERIODOS as readonly number[]).includes(diasParam) ? diasParam : 30

    const agora = new Date()
    const hoje = chaveDia(agora)
    const inicioHoje = new Date(`${hoje}T00:00:00-03:00`)
    const inicio = new Date(inicioHoje.getTime() - (dias - 1) * DIA_MS)
    const inicioAnterior = new Date(inicio.getTime() - dias * DIA_MS)
    const limiteAtraso = new Date(agora.getTime() - ATRASO_MINUTOS * 60_000)

    const [criados, entregues, pagamentos, emAndamento, atrasados, frota, pagamentosPendentes, recentes] = await Promise.all([
      prisma.pedido.findMany({
        where: { createdAt: { gte: inicioAnterior } },
        select: {
          createdAt: true, status: true, tipoServico: true, valorTotal: true, clienteId: true,
          enderecoDestino: { select: { bairro: true } },
        },
      }),
      prisma.pedido.findMany({
        where: { status: 'ENTREGUE', entregueEm: { gte: inicioAnterior } },
        select: { createdAt: true, entregueEm: true, tipoServico: true, motoboyId: true, valorTotal: true },
      }),
      prisma.pagamento.findMany({
        where: { status: 'APROVADO', aprovadoEm: { gte: inicioAnterior } },
        select: { valor: true, taxaPlataforma: true, metodo: true, aprovadoEm: true, clienteId: true },
      }),
      prisma.pedido.groupBy({
        by: ['status'],
        where: { status: { in: ['SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA'] } },
        _count: { _all: true },
      }),
      prisma.pedido.count({ where: { status: 'SOLICITADO', createdAt: { lt: limiteAtraso } } }),
      prisma.motoboy.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.pagamento.count({ where: { status: { in: ['PENDENTE', 'PROCESSANDO'] } } }),
      prisma.pedido.findMany({
        take: 8,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true, status: true, tipoServico: true, valorTotal: true, createdAt: true,
          cliente: { select: { user: { select: { nome: true } } } },
          enderecoOrigem: { select: { bairro: true } },
          enderecoDestino: { select: { bairro: true } },
        },
      }),
    ])

    const noPeriodo = (d: Date | null) => !!d && d >= inicio
    const noAnterior = (d: Date | null) => !!d && d >= inicioAnterior && d < inicio

    // Série diária
    const serie = Array.from({ length: dias }, (_, i) => {
      const d = new Date(inicio.getTime() + i * DIA_MS)
      return {
        data: chaveDia(d),
        receita: 0,
        pedidos: 0,
        entregues: 0,
        cancelados: 0,
      }
    })
    const indice = new Map(serie.map((s, i) => [s.data, i]))
    const ponto = (d: Date) => serie[indice.get(chaveDia(d)) ?? -1]

    // Pedidos criados
    const demanda = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
    const porStatus = new Map<StatusPedido, number>()
    const porServico = new Map<TipoServico, { pedidos: number; valor: number }>()
    const porBairro = new Map<string, number>()
    let pedidosAtual = 0, pedidosAnterior = 0, canceladosAtual = 0, canceladosAnterior = 0
    for (const p of criados) {
      if (noPeriodo(p.createdAt)) {
        pedidosAtual++
        if (p.status === 'CANCELADO') canceladosAtual++
        const s = ponto(p.createdAt)
        if (s) {
          s.pedidos++
          if (p.status === 'CANCELADO') s.cancelados++
        }
        const l = local(p.createdAt)
        demanda[l.getUTCDay()][l.getUTCHours()]++
        porStatus.set(p.status, (porStatus.get(p.status) ?? 0) + 1)
        const sv = porServico.get(p.tipoServico) ?? { pedidos: 0, valor: 0 }
        sv.pedidos++
        if (p.status !== 'CANCELADO') sv.valor += Number(p.valorTotal)
        porServico.set(p.tipoServico, sv)
        const bairro = p.enderecoDestino?.bairro?.trim()
        if (bairro) porBairro.set(bairro, (porBairro.get(bairro) ?? 0) + 1)
      } else if (noAnterior(p.createdAt)) {
        pedidosAnterior++
        if (p.status === 'CANCELADO') canceladosAnterior++
      }
    }

    // Entregas concluídas e tempo de entrega (agendadas ficam de fora: o prazo é do cliente)
    let entreguesAtual = 0, entreguesAnterior = 0
    const tempos = { atual: [] as number[], anterior: [] as number[] }
    const porEntregador = new Map<string, { entregas: number; valor: number }>()
    for (const e of entregues) {
      const minutos = e.entregueEm ? (e.entregueEm.getTime() - e.createdAt.getTime()) / 60_000 : null
      const conta = e.tipoServico !== 'AGENDADA' && minutos !== null && minutos > 0 && minutos < 24 * 60
      if (noPeriodo(e.entregueEm)) {
        entreguesAtual++
        const s = ponto(e.entregueEm!)
        if (s) s.entregues++
        if (conta) tempos.atual.push(minutos!)
        if (e.motoboyId) {
          const m = porEntregador.get(e.motoboyId) ?? { entregas: 0, valor: 0 }
          m.entregas++
          m.valor += Number(e.valorTotal)
          porEntregador.set(e.motoboyId, m)
        }
      } else if (noAnterior(e.entregueEm)) {
        entreguesAnterior++
        if (conta) tempos.anterior.push(minutos!)
      }
    }

    // Receita
    let receitaAtual = 0, receitaAnterior = 0, taxaAtual = 0, taxaAnterior = 0, pagosAtual = 0, pagosAnterior = 0
    const porMetodo = new Map<MetodoPagamento, { valor: number; quantidade: number }>()
    const porCliente = new Map<string, { valor: number; pedidos: number }>()
    for (const pg of pagamentos) {
      const valor = Number(pg.valor)
      if (noPeriodo(pg.aprovadoEm)) {
        receitaAtual += valor
        taxaAtual += Number(pg.taxaPlataforma)
        pagosAtual++
        const s = ponto(pg.aprovadoEm!)
        if (s) s.receita += valor
        const m = porMetodo.get(pg.metodo) ?? { valor: 0, quantidade: 0 }
        m.valor += valor
        m.quantidade++
        porMetodo.set(pg.metodo, m)
        const c = porCliente.get(pg.clienteId) ?? { valor: 0, pedidos: 0 }
        c.valor += valor
        c.pedidos++
        porCliente.set(pg.clienteId, c)
      } else if (noAnterior(pg.aprovadoEm)) {
        receitaAnterior += valor
        taxaAnterior += Number(pg.taxaPlataforma)
        pagosAnterior++
      }
    }

    const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
    const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)

    const topEntregadoresIds = [...porEntregador.entries()].sort((a, b) => b[1].entregas - a[1].entregas).slice(0, 5)
    const topClientesIds = [...porCliente.entries()].sort((a, b) => b[1].valor - a[1].valor).slice(0, 5)
    const [motoboys, clientes] = await Promise.all([
      prisma.motoboy.findMany({
        where: { id: { in: topEntregadoresIds.map(([id]) => id) } },
        select: { id: true, avaliacaoMedia: true, status: true, user: { select: { nome: true } } },
      }),
      prisma.cliente.findMany({
        where: { id: { in: topClientesIds.map(([id]) => id) } },
        select: { id: true, razaoSocial: true, user: { select: { nome: true } } },
      }),
    ])
    const motoboyPorId = new Map(motoboys.map((m) => [m.id, m]))
    const clientePorId = new Map(clientes.map((c) => [c.id, c]))

    const ativos = new Map(emAndamento.map((g) => [g.status, g._count._all]))
    const frotaMap = new Map(frota.map((g) => [g.status, g._count._all]))

    for (const s of serie) s.receita = Math.round(s.receita * 100) / 100

    return jsonResponse({
      success: true,
      data: {
        periodo: { dias, inicio: inicio.toISOString(), fim: agora.toISOString() },
        atualizadoEm: agora.toISOString(),
        kpis: {
          receita: variacao(receitaAtual, receitaAnterior),
          receitaPlataforma: variacao(taxaAtual, taxaAnterior),
          pedidos: variacao(pedidosAtual, pedidosAnterior),
          entregues: variacao(entreguesAtual, entreguesAnterior),
          ticketMedio: variacao(pagosAtual ? receitaAtual / pagosAtual : 0, pagosAnterior ? receitaAnterior / pagosAnterior : 0),
          tempoMedioEntrega: variacao(media(tempos.atual), media(tempos.anterior)),
          taxaCancelamento: variacao(pct(canceladosAtual, pedidosAtual), pct(canceladosAnterior, pedidosAnterior)),
        },
        serie,
        operacao: {
          aguardando: ativos.get('SOLICITADO') ?? 0,
          aceitos: ativos.get('ACEITO') ?? 0,
          emColeta: ativos.get('EM_COLETA') ?? 0,
          emEntrega: ativos.get('EM_ENTREGA') ?? 0,
          atrasados,
          atrasoMinutos: ATRASO_MINUTOS,
          pagamentosPendentes,
        },
        frota: {
          disponivel: frotaMap.get('DISPONIVEL') ?? 0,
          emEntrega: frotaMap.get('EM_ENTREGA') ?? 0,
          offline: frotaMap.get('OFFLINE') ?? 0,
        },
        statusPeriodo: (Object.keys(LABELS_STATUS_PEDIDO) as StatusPedido[])
          .map((status) => ({ status, label: LABELS_STATUS_PEDIDO[status], quantidade: porStatus.get(status) ?? 0 })),
        servicos: (Object.keys(LABELS_TIPO_SERVICO) as TipoServico[])
          .map((tipo) => ({ tipo, label: LABELS_TIPO_SERVICO[tipo], pedidos: porServico.get(tipo)?.pedidos ?? 0, valor: porServico.get(tipo)?.valor ?? 0 })),
        metodos: [...porMetodo.entries()]
          .map(([metodo, v]) => ({ metodo, label: LABELS_METODO_PAGAMENTO[metodo], ...v }))
          .sort((a, b) => b.valor - a.valor),
        demanda,
        topEntregadores: topEntregadoresIds.map(([id, v]) => ({
          id,
          nome: motoboyPorId.get(id)?.user.nome ?? '—',
          status: motoboyPorId.get(id)?.status ?? 'OFFLINE',
          avaliacao: motoboyPorId.get(id)?.avaliacaoMedia ?? null,
          ...v,
        })),
        topClientes: topClientesIds.map(([id, v]) => ({
          id,
          nome: clientePorId.get(id)?.razaoSocial || clientePorId.get(id)?.user.nome || '—',
          ...v,
        })),
        topBairros: [...porBairro.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([bairro, pedidos]) => ({ bairro, pedidos })),
        pedidosRecentes: recentes,
      },
    })
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
    return serverError('Erro ao carregar dashboard')
  }
}
