import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import prisma from '@/lib/prisma'
import { jsonResponse } from '@/lib/json-response'
import { stripeClient } from '@/lib/stripe'
import { comPedidoBloqueado, liberarCreditoEntrega } from '@/lib/pedido-transaction'

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return jsonResponse({ success: false }, { status: 503 })
  let event: Stripe.Event
  try { event = stripeClient().webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') ?? '', secret) }
  catch { return jsonResponse({ success: false }, { status: 400 }) }
  if (!event.type.startsWith('checkout.session.')) return jsonResponse({ received: true })
  const session = event.data.object as Stripe.Checkout.Session
  const id = session.metadata?.pedidoId
  if (!id) return jsonResponse({ received: true })
  try {
    const settings = event.account ? await prisma.organizationSettings.findUnique({ where: { stripeAccountId: event.account } }) : null
    if (!settings || settings.organizationId !== session.metadata?.organizationId) return jsonResponse({ success: false }, { status: 400 })
    await comPedidoBloqueado(id, async tx => {
      if (await tx.gatewayEvento.findUnique({ where: { id: event.id } })) return
      const p = await tx.pagamento.findUnique({ where: { pedidoId: id } })
      if (!p || p.organizationId !== settings.organizationId || p.id !== session.metadata?.pagamentoId || p.gatewayId !== session.id) throw new Error('Aguardando vínculo do checkout')
      if (session.currency !== 'brl' || session.amount_total !== p.valor.mul(100).toNumber()) throw new Error('Valor divergente')
      const pago = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && session.payment_status === 'paid'
      const falhou = ['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)
      if (pago && p.status !== 'APROVADO' && p.status !== 'REEMBOLSADO') {
        await tx.pagamento.update({ where: { id: p.id }, data: { status: 'APROVADO', aprovadoEm: new Date() } })
        await liberarCreditoEntrega(tx, id)
        await tx.pedidoEvento.create({ data: { pedidoId: id, organizationId: p.organizationId, descricao: 'Pagamento online confirmado pelo provedor' } })
      } else if (falhou && p.status === 'PROCESSANDO') {
        await tx.pagamento.update({ where: { id: p.id }, data: { status: 'CANCELADO', canceladoEm: new Date() } })
      }
      await tx.gatewayEvento.create({ data: { id: event.id, organizationId: p.organizationId, tipo: event.type } })
    })
    return jsonResponse({ received: true })
  } catch { return jsonResponse({ success: false }, { status: 500 }) }
}
