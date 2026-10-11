import { jsonResponse } from '@/lib/json-response'
import { requireGestor, serverError } from '@/lib/auth-helpers'
import { lerUso } from '@/lib/uso'

// GET /api/organizacao/uso - Plano, limites e consumo do mês da central ativa
export async function GET() {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    return jsonResponse({ success: true, data: await lerUso(auth.user.organizationId) })
  } catch (error) {
    console.error('Erro ao ler uso da central:', error)
    return serverError('Erro ao ler uso da central')
  }
}
