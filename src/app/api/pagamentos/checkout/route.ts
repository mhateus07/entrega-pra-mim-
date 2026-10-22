import { NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import prisma from '@/lib/prisma'
import { requireOrgAccess, badRequest, serverError, applyRateLimit } from '@/lib/auth-helpers'
import { jsonResponse } from '@/lib/json-response'
import { stripeClient, verificarContaStripe, appUrl } from '@/lib/stripe'
import { comPedidoBloqueado } from '@/lib/pedido-transaction'
import { podeGerenciarPagamento } from '@/lib/pedido-permissions'
import { OperacaoError } from '@/lib/operacao-error'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response
    const limite = await applyRateLimit(request, 'sensitive', auth.user.id)
    if (!limite.success) return limite.response
    const body = z.object({ pedidoId: z.string().cuid() }).safeParse(await request.json().catch(() => null))
    if (!body.success) return badRequest('Pedido inválido')
    const pedido = await prisma.pedido.findFirst({ where: { id: body.data.pedidoId, organizationId: auth.user.organizationId } })
    if (!pedido || !podeGerenciarPagamento(auth.user, pedido)) throw new OperacaoError('Pedido não encontrado', 404)
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new OperacaoError('Confirmação de pagamentos ainda não configurada', 503)
    const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: auth.user.organizationId } })
    const account = settings?.stripeAccountId
    if (!account || !await verificarContaStripe(account)) throw new OperacaoError('A central ainda não está habilitada para pagamento online', 503)
    const stripe = stripeClient()
    // Reserva durável antes da chamada externa: timeout/retry mantém a mesma chave.
    const pg = await comPedidoBloqueado(pedido.id, async tx => {
      const p = await tx.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: { pagamento: true } })
      if (p.status === 'CANCELADO') throw new OperacaoError('Pedido cancelado')
      if (p.pagamento?.status === 'APROVADO' || p.pagamento?.status === 'REEMBOLSADO') throw new OperacaoError('Pagamento já concluído')
      if (p.pagamento?.gatewayId?.startsWith('cs_') || (p.pagamento?.status === 'PROCESSANDO' && p.pagamento.gatewayResponse?.startsWith('checkout:'))) return p.pagamento
      if (p.pagamento && !['CANCELADO', 'RECUSADO'].includes(p.pagamento.status)) throw new OperacaoError('Cancele o pagamento pendente antes de trocar o método')
      const data = { metodo: 'CARTAO_CREDITO' as const, status: 'PROCESSANDO' as const, gatewayId: null, gatewayResponse: `checkout:${randomUUID()}`, valor: p.valorTotal, valorMotoboy: p.valorRepasse ?? 0, canceladoEm: null }
      return tx.pagamento.upsert({ where: { pedidoId: p.id }, create: { organizationId: p.organizationId, pedidoId: p.id, clienteId: p.clienteId, ...data }, update: data })
    })
    if (pg.gatewayId?.startsWith('cs_')) {
      const anterior = await stripe.checkout.sessions.retrieve(pg.gatewayId, {}, { stripeAccount: account })
      if (anterior.status === 'open' && anterior.url) return jsonResponse({ success: true, data: { url: anterior.url } })
      if (anterior.status === 'complete') throw new OperacaoError('Pagamento em confirmação. Acompanhe o pedido.')
      await comPedidoBloqueado(pedido.id, tx => tx.pagamento.updateMany({ where: { id: pg.id, gatewayId: anterior.id, status: { in: ['PROCESSANDO', 'CANCELADO'] } }, data: { status: 'CANCELADO', gatewayId: null, gatewayResponse: null, canceladoEm: new Date() } }))
      throw new OperacaoError('Checkout expirado. Clique novamente para abrir uma nova tentativa.')
    }
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment', integration_identifier: 'epm_checkout_qzmxpavk', client_reference_id: pedido.id,
      metadata: { pedidoId: pedido.id, pagamentoId: pg.id, organizationId: pedido.organizationId },
      line_items: [{ quantity: 1, price_data: { currency: 'brl', unit_amount: pg.valor.mul(100).toNumber(), product_data: { name: `Entrega ${pedido.id.slice(-6).toUpperCase()}` } } }],
      success_url: `${appUrl()}/cliente/pedido/${pedido.id}?pagamento=confirmando`, cancel_url: `${appUrl()}/cliente/pedido/${pedido.id}`,
    }, { stripeAccount: account, idempotencyKey: pg.gatewayResponse! })
    await comPedidoBloqueado(pedido.id, tx => tx.pagamento.updateMany({ where: { id: pg.id, status: 'PROCESSANDO', gatewayResponse: pg.gatewayResponse }, data: { gatewayId: checkout.id } }))
    return jsonResponse({ success: true, data: { url: checkout.url } })
  } catch (e) {
    if (e instanceof OperacaoError) return jsonResponse({ success: false, error: e.message }, { status: e.status })
    return serverError('Não foi possível abrir o checkout. Tente novamente: a mesma tentativa será recuperada.')
  }
}
