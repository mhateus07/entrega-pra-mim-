import prisma from '@/lib/prisma'
import { requireAdmin, serverError } from '@/lib/auth-helpers'
import { jsonResponse } from '@/lib/json-response'
import { LABELS_STATUS_PEDIDO } from '@/utils/helpers'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.authenticated) return auth.response
  try {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const inicioHoje = new Date(`${hoje}T00:00:00-03:00`)
    const inicioPeriodo = new Date(inicioHoje.getTime() - 6 * 86400000)
    const [totalPedidos, pedidosHoje, entregasHoje, faturamentoHoje, pedidosPendentes, motoboysAtivos, recentes, grupos, dias] = await Promise.all([
      prisma.pedido.count(),
      prisma.pedido.count({ where: { createdAt: { gte: inicioHoje } } }),
      prisma.pedido.count({ where: { status: 'ENTREGUE', entregueEm: { gte: inicioHoje } } }),
      prisma.pagamento.aggregate({ where: { status: 'APROVADO', aprovadoEm: { gte: inicioHoje } }, _sum: { valor: true } }),
      prisma.pedido.count({ where: { status: 'SOLICITADO' } }),
      prisma.motoboy.count({ where: { status: 'DISPONIVEL' } }),
      prisma.pedido.findMany({ take: 5, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, status: true, tipoServico: true, valorTotal: true, createdAt: true, cliente: { select: { user: { select: { nome: true } } } } } }),
      prisma.pedido.groupBy({ by: ['status'], _count: { _all: true } }),
      Promise.all(Array.from({ length: 7 }, async (_, i) => {
        const inicio = new Date(inicioPeriodo.getTime() + i * 86400000)
        const fim = new Date(inicio.getTime() + 86400000)
        const [total, recebido] = await Promise.all([
          prisma.pedido.count({ where: { createdAt: { gte: inicio, lt: fim } } }),
          prisma.pagamento.aggregate({ where: { status: 'APROVADO', aprovadoEm: { gte: inicio, lt: fim } }, _sum: { valor: true }, _count: { _all: true } }),
        ])
        return { inicio, total, recebido }
      })),
    ])
    return jsonResponse({ success: true, data: {
      stats: { totalPedidos, pedidosHoje, entregasHoje, faturamentoHoje: faturamentoHoje._sum.valor ?? 0, pedidosPendentes, motoboysAtivos },
      pedidosRecentes: recentes,
      chartData: {
        faturamentoDiario: dias.map(d => ({ data: d.inicio.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }), valor: d.recebido._sum.valor ?? 0, pedidos: d.recebido._count._all })),
        pedidosPorDia: dias.map(d => ({ dia: d.inicio.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' }), total: d.total })),
        statusPedidos: grupos.map(g => ({ status: LABELS_STATUS_PEDIDO[g.status], count: g._count._all })),
      },
    } })
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
    return serverError('Erro ao carregar dashboard')
  }
}
