import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth, forbidden, notFound, serverError, badRequest, applyRateLimit } from '@/lib/auth-helpers'
import { podeGerenciarPagamento } from '@/lib/pedido-permissions'
import { executarAcaoPagamento } from '@/lib/payment-operations'
import { OperacaoError } from '@/lib/operacao-error'

interface RouteParams { params: Promise<{ id: string }> }

function erroPagamento(error: unknown) {
  if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
  console.error('Erro na operação de pagamento:', error)
  return serverError('Erro ao processar pagamento')
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response
    const { id } = await params
    const pagamento = await prisma.pagamento.findUnique({
      where: { id },
      include: { pedido: { select: { id: true, status: true, tipoServico: true, valorTotal: true } } },
    })
    if (!pagamento) return notFound('Pagamento não encontrado')
    if (!podeGerenciarPagamento(auth.user, pagamento)) return forbidden('Acesso negado')
    return jsonResponse({ success: true, data: pagamento })
  } catch (error) { return erroPagamento(error) }
}

const acaoSchema = z.object({ acao: z.enum(['verificar', 'confirmar_dinheiro']) })

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response
    const limit = await applyRateLimit(request, 'sensitive')
    if (!limit.success) return limit.response
    const validation = acaoSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest('Ação inválida')
    const { id } = await params
    const pagamento = await prisma.pagamento.findUnique({ where: { id }, select: { pedidoId: true } })
    if (!pagamento) return notFound('Pagamento não encontrado')
    const updated = await executarAcaoPagamento(pagamento.pedidoId, id, auth.user, validation.data.acao)
    return jsonResponse({ success: true, data: { status: updated.status },
      message: updated.status === 'APROVADO' ? 'Pagamento confirmado!' : `Status: ${updated.status}` })
  } catch (error) { return erroPagamento(error) }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response
    const limit = await applyRateLimit(request, 'sensitive')
    if (!limit.success) return limit.response
    const { id } = await params
    const pagamento = await prisma.pagamento.findUnique({ where: { id }, select: { pedidoId: true } })
    if (!pagamento) return notFound('Pagamento não encontrado')
    const updated = await executarAcaoPagamento(pagamento.pedidoId, id, auth.user, 'cancelar')
    return jsonResponse({ success: true, data: updated, message: 'Pagamento cancelado' })
  } catch (error) { return erroPagamento(error) }
}
