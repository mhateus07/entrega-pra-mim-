import Stripe from 'stripe'
import { OperacaoError } from './operacao-error'

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new OperacaoError('Pagamento online ainda não configurado', 503)
  return new Stripe(key, { maxNetworkRetries: 1, timeout: 15000 })
}

export function appUrl() {
  const url = process.env.NEXTAUTH_URL
  if (!url) throw new OperacaoError('Endereço do aplicativo não configurado', 503)
  return new URL(url).origin
}

export async function verificarContaStripe(id: string) {
  const conta = await stripeClient().v2.core.accounts.retrieve(id, { include: ['configuration.merchant'] })
  return conta.configuration?.merchant?.capabilities?.card_payments?.status === 'active'
}
