import prisma from '@/lib/prisma'
import { requireMotoboyOwnership, serverError } from '@/lib/auth-helpers'
import { jsonResponse } from '@/lib/json-response'

const DIA_MS = 86_400_000
const OFFSET_MS = 3 * 3_600_000 // America/Sao_Paulo, sem horário de verão
const DIAS_SERIE = 14
const chaveDia = (d: Date) => new Date(d.getTime() - OFFSET_MS).toISOString().slice(0, 10)

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireMotoboyOwnership(id)
  if (!auth.authenticated) return auth.response
  try {
    const inicioHoje = new Date(`${chaveDia(new Date())}T00:00:00-03:00`)
    const inicioSerie = new Date(inicioHoje.getTime() - (DIAS_SERIE - 1) * DIA_MS)
    const [totalEntregas, cancelados, ganhos, avaliacao, creditos] = await Promise.all([
      prisma.pedido.count({ where: { motoboyId: id, status: 'ENTREGUE' } }),
      prisma.pedido.count({ where: { motoboyId: id, status: 'CANCELADO' } }),
      prisma.transacaoMotoboy.aggregate({ where: { motoboyId: id, tipo: 'CREDITO', status: 'CONCLUIDO' }, _sum: { valor: true } }),
      prisma.avaliacao.aggregate({ where: { motoboyId: id }, _avg: { nota: true } }),
      prisma.transacaoMotoboy.findMany({
        where: { motoboyId: id, tipo: 'CREDITO', status: { not: 'CANCELADO' }, createdAt: { gte: inicioSerie } },
        select: { valor: true, createdAt: true },
      }),
    ])
    const ganhosDiarios = Array.from({ length: DIAS_SERIE }, (_, i) => ({
      data: chaveDia(new Date(inicioSerie.getTime() + i * DIA_MS)),
      valor: 0,
      entregas: 0,
    }))
    const indice = new Map(ganhosDiarios.map((d, i) => [d.data, i]))
    for (const c of creditos) {
      const dia = ganhosDiarios[indice.get(chaveDia(c.createdAt)) ?? -1]
      if (!dia) continue
      dia.valor = Math.round((dia.valor + Number(c.valor)) * 100) / 100
      dia.entregas++
    }
    return jsonResponse({
      success: true,
      data: { totalEntregas, cancelados, ganhoTotal: ganhos._sum.valor ?? 0, avaliacaoMedia: avaliacao._avg.nota ?? 5, ganhosDiarios },
    })
  } catch (error) {
    console.error('Erro ao obter resumo:', error)
    return serverError('Erro ao obter resumo')
  }
}
