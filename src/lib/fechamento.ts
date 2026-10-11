// =============================================================================
// Fechamento do dia/mês (relatório; não movimenta saldo nem dinheiro)
// =============================================================================
// Considera os pedidos ENTREGUES no período (pela data de entrega).
// Por motoboy: corridas, km, valor das corridas, repasse (% da central),
// dinheiro que ele recebeu em mãos e o saldo do acerto.
// Por empresa cliente: corridas, km, valor total, já pago e a cobrar.
// =============================================================================

import { Prisma } from '@prisma/client'
import prisma from './prisma'
import { money } from './money'

export type Visao = 'motoboy' | 'cliente'

export interface PedidoFechamento {
  motoboyId: string | null
  motoboyNome: string | null
  clienteId: string
  clienteNome: string
  distanciaKm: number
  valorTotal: Prisma.Decimal
  pagamento: { metodo: string; status: string; valor: Prisma.Decimal } | null
}

export interface LinhaMotoboy {
  motoboyId: string; nome: string; corridas: number; km: number
  valorCorridas: number; repasse: number; dinheiroRecebido: number; saldoAcerto: number
}

export interface LinhaCliente {
  clienteId: string; nome: string; corridas: number; km: number
  valorTotal: number; pago: number; aCobrar: number
}

const zero = () => new Prisma.Decimal(0)

export function porMotoboy(pedidos: PedidoFechamento[], repasse: Prisma.Decimal.Value): LinhaMotoboy[] {
  const grupos = new Map<string, { nome: string; corridas: number; km: number; valor: Prisma.Decimal; dinheiro: Prisma.Decimal }>()
  for (const p of pedidos) {
    if (!p.motoboyId) continue
    const g = grupos.get(p.motoboyId) ?? { nome: p.motoboyNome ?? '—', corridas: 0, km: 0, valor: zero(), dinheiro: zero() }
    g.corridas++
    g.km += p.distanciaKm
    g.valor = g.valor.plus(p.valorTotal)
    // Dinheiro na entrega fica com o motoboy até o acerto com a central
    if (p.pagamento?.metodo === 'DINHEIRO' && p.pagamento.status === 'APROVADO') g.dinheiro = g.dinheiro.plus(p.pagamento.valor)
    grupos.set(p.motoboyId, g)
  }
  return [...grupos].map(([motoboyId, g]) => {
    const valorRepasse = money(g.valor.mul(new Prisma.Decimal(repasse)))
    return {
      motoboyId, nome: g.nome, corridas: g.corridas, km: Math.round(g.km * 10) / 10,
      valorCorridas: money(g.valor).toNumber(), repasse: valorRepasse.toNumber(),
      dinheiroRecebido: money(g.dinheiro).toNumber(), saldoAcerto: valorRepasse.minus(money(g.dinheiro)).toNumber(),
    }
  }).sort((a, b) => b.corridas - a.corridas || a.nome.localeCompare(b.nome))
}

export function porCliente(pedidos: PedidoFechamento[]): LinhaCliente[] {
  const grupos = new Map<string, { nome: string; corridas: number; km: number; valor: Prisma.Decimal; pago: Prisma.Decimal }>()
  for (const p of pedidos) {
    const g = grupos.get(p.clienteId) ?? { nome: p.clienteNome, corridas: 0, km: 0, valor: zero(), pago: zero() }
    g.corridas++
    g.km += p.distanciaKm
    g.valor = g.valor.plus(p.valorTotal)
    if (p.pagamento?.status === 'APROVADO') g.pago = g.pago.plus(p.pagamento.valor)
    grupos.set(p.clienteId, g)
  }
  return [...grupos].map(([clienteId, g]) => ({
    clienteId, nome: g.nome, corridas: g.corridas, km: Math.round(g.km * 10) / 10,
    valorTotal: money(g.valor).toNumber(), pago: money(g.pago).toNumber(),
    aCobrar: money(Prisma.Decimal.max(zero(), g.valor.minus(g.pago))).toNumber(),
  })).sort((a, b) => b.valorTotal - a.valorTotal || a.nome.localeCompare(b.nome))
}

/** Início do dia (00:00) de uma data AAAA-MM-DD no fuso da central, em UTC. */
export function inicioDoDia(data: string, fuso: string): Date {
  const referencia = new Date(`${data}T12:00:00Z`)
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: fuso, timeZoneName: 'longOffset' })
    .formatToParts(referencia).find(p => p.type === 'timeZoneName')?.value.replace('GMT', '') || '+00:00'
  return new Date(`${data}T00:00:00${offset === '' ? '+00:00' : offset}`)
}

export async function carregarPedidosFechamento(organizationId: string, de: string, ate: string) {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId }, select: { fusoHorario: true, repasseMotoboy: true } })
  const fuso = settings?.fusoHorario ?? 'America/Sao_Paulo'
  const inicio = inicioDoDia(de, fuso)
  const fim = new Date(inicioDoDia(ate, fuso).getTime() + 86_400_000)
  const rows = await prisma.pedido.findMany({
    where: { organizationId, status: 'ENTREGUE', entregueEm: { gte: inicio, lt: fim } },
    select: {
      motoboyId: true, clienteId: true, distanciaKm: true, valorTotal: true,
      motoboy: { select: { user: { select: { nome: true } } } },
      cliente: { select: { razaoSocial: true, user: { select: { nome: true } } } },
      pagamento: { select: { metodo: true, status: true, valor: true } },
    },
  })
  const pedidos: PedidoFechamento[] = rows.map(r => ({
    motoboyId: r.motoboyId, motoboyNome: r.motoboy?.user.nome ?? null,
    clienteId: r.clienteId, clienteNome: r.cliente.razaoSocial || r.cliente.user.nome,
    distanciaKm: r.distanciaKm, valorTotal: r.valorTotal, pagamento: r.pagamento,
  }))
  return { pedidos, repasse: settings?.repasseMotoboy ?? new Prisma.Decimal(0.7) }
}

// ---------------------------------------------------------------------------
// CSV para Excel em português: separador ";", vírgula decimal e BOM UTF-8
// ---------------------------------------------------------------------------

function celula(valor: string | number): string {
  let texto = typeof valor === 'number' ? valor.toFixed(2).replace('.', ',') : valor
  // Evita que o Excel interprete o conteúdo como fórmula (CSV injection)
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function gerarCsv(cabecalho: string[], linhas: (string | number)[][]): string {
  return '﻿' + [cabecalho, ...linhas].map(l => l.map(celula).join(';')).join('\r\n') + '\r\n'
}

export function csvMotoboys(linhas: LinhaMotoboy[]) {
  return gerarCsv(
    ['Motoboy', 'Corridas', 'Km', 'Valor das corridas (R$)', 'Repasse (R$)', 'Dinheiro recebido (R$)', 'Saldo do acerto (R$)'],
    linhas.map(l => [l.nome, String(l.corridas), l.km, l.valorCorridas, l.repasse, l.dinheiroRecebido, l.saldoAcerto]),
  )
}

export function csvClientes(linhas: LinhaCliente[]) {
  return gerarCsv(
    ['Empresa cliente', 'Corridas', 'Km', 'Valor total (R$)', 'Já pago (R$)', 'A cobrar (R$)'],
    linhas.map(l => [l.nome, String(l.corridas), l.km, l.valorTotal, l.pago, l.aCobrar]),
  )
}
