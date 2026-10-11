import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonResponse } from '@/lib/json-response'
import { requireOrgAccess, badRequest, serverError } from '@/lib/auth-helpers'
import { aceitarOferta, recusarOferta } from '@/lib/despacho'
import { registrarAuditoria } from '@/lib/audit'
import { OperacaoError } from '@/lib/operacao-error'

const schema = z.object({ acao: z.enum(['aceitar', 'recusar']) })

// POST /api/despacho/ofertas/[id] - Motoboy aceita ou recusa a oferta
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOrgAccess(['DRIVER'])
    if (!auth.authenticated) return auth.response
    const validation = schema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest('Ação inválida')
    const { id } = await params

    if (validation.data.acao === 'aceitar') {
      const pedido = await aceitarOferta(id, auth.user)
      await registrarAuditoria({
        acao: 'pedido.status', entidade: 'Pedido', entidadeId: pedido.id, userId: auth.user.id,
        organizationId: auth.user.organizationId, request, dados: { para: 'ACEITO', via: 'oferta', ofertaId: id },
      })
      return jsonResponse({ success: true, data: pedido, message: 'Corrida aceita' })
    }
    await recusarOferta(id, auth.user)
    return jsonResponse({ success: true, message: 'Oferta recusada' })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao responder oferta:', error)
    return serverError()
  }
}
