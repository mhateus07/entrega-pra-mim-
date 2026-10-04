import prisma from '@/lib/prisma'
import { requireMotoboyOwnership, serverError } from '@/lib/auth-helpers'
import { jsonResponse } from '@/lib/json-response'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireMotoboyOwnership(id)
  if (!auth.authenticated) return auth.response
  try {
    const [totalEntregas, cancelados, ganhos, avaliacao] = await Promise.all([
      prisma.pedido.count({ where: { motoboyId: id, status: 'ENTREGUE' } }),
      prisma.pedido.count({ where: { motoboyId: id, status: 'CANCELADO' } }),
      prisma.transacaoMotoboy.aggregate({ where: { motoboyId: id, tipo: 'CREDITO', status: 'CONCLUIDO' }, _sum: { valor: true } }),
      prisma.avaliacao.aggregate({ where: { motoboyId: id }, _avg: { nota: true } }),
    ])
    return jsonResponse({ success: true, data: { totalEntregas, cancelados, ganhoTotal: ganhos._sum.valor ?? 0, avaliacaoMedia: avaliacao._avg.nota ?? 5 } })
  } catch (error) {
    console.error('Erro ao obter resumo:', error)
    return serverError('Erro ao obter resumo')
  }
}
