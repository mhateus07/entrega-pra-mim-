import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import { applyRateLimit, notFound, serverError } from '@/lib/auth-helpers'
import { marcaPublica } from '@/lib/marca'

// GET /api/publico/organizacoes/[slug] - Marca pública da central (login e PWA)
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const rateLimit = await applyRateLimit(request, 'polling')
    if (!rateLimit.success) return rateLimit.response
    const marca = await marcaPublica((await params).slug)
    if (!marca) return notFound('Central não encontrada')
    return jsonResponse({ success: true, data: marca })
  } catch (error) {
    console.error('Erro ao ler marca pública:', error)
    return serverError()
  }
}
