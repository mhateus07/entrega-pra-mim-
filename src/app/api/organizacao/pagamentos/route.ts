import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireOwner, requireOrgAccess, serverError } from '@/lib/auth-helpers'
import { stripeClient, appUrl, verificarContaStripe } from '@/lib/stripe'
import { OperacaoError } from '@/lib/operacao-error'

export async function GET() {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response
    const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: auth.user.organizationId } })
    const configurado = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET
    const conectado = !!settings?.stripeAccountId
    const ativo = configurado && conectado && await verificarContaStripe(settings!.stripeAccountId!)
    return jsonResponse({ success: true, data: { configurado, conectado, ativo, teste: !process.env.STRIPE_SECRET_KEY?.includes('_live_') } })
  } catch { return serverError('Não foi possível verificar os pagamentos online') }
}

export async function POST() {
  try {
    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response
    const organizationId = auth.user.organizationId
    const stripe = stripeClient()
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, include: { settings: true } })
    let account = org.settings?.stripeAccountId
    if (!account) {
      const criada = await stripe.v2.core.accounts.create({
        display_name: org.nome, contact_email: auth.user.email, dashboard: 'full', identity: { country: 'br' },
        configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
        defaults: { currency: 'brl', responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
      }, { idempotencyKey: `central:${organizationId}` })
      account = criada.id
      await prisma.organizationSettings.upsert({ where: { organizationId }, create: { organizationId, stripeAccountId: account }, update: { stripeAccountId: account } })
    }
    const link = await stripe.v2.core.accountLinks.create({ account, use_case: { type: 'account_onboarding', account_onboarding: { return_url: `${appUrl()}/dashboard/fechamento`, refresh_url: `${appUrl()}/dashboard/fechamento`, collection_options: { fields: 'eventually_due' } } } })
    return jsonResponse({ success: true, data: { url: link.url } })
  } catch (e) {
    if (e instanceof OperacaoError) return jsonResponse({ success: false, error: e.message }, { status: e.status })
    // Mensagem sanitizada: erros do provedor não são devolvidos com payloads/segredos.
    return serverError('Não foi possível iniciar o cadastro. Confira se Stripe Connect está ativado na conta da plataforma.')
  }
}
