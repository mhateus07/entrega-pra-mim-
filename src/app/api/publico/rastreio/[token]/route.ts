import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import { applyRateLimit, notFound, serverError } from '@/lib/auth-helpers'
import { buscarPedidoPorToken, montarRastreioPublico } from '@/lib/rastreio-publico'

// GET /api/publico/rastreio/[token] - Acompanhamento sem login (destinatário)
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const rateLimit = await applyRateLimit(request, 'polling')
    if (!rateLimit.success) return rateLimit.response
    const { token } = await params
    const pedido = await buscarPedidoPorToken(token)
    if (!pedido) return notFound('Link de rastreio inválido')
    return jsonResponse({ success: true, data: montarRastreioPublico(pedido, token) }, {
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    })
  } catch (error) {
    console.error('Erro no rastreio público:', error)
    return serverError()
  }
}
