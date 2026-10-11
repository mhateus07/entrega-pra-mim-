import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireOrgAccess, requirePedidoAccess, notFound, forbidden, serverError } from '@/lib/auth-helpers'
import { gerarToken, urlBase } from '@/lib/tokens'
import { registrarAuditoria } from '@/lib/audit'

// POST /api/pedidos/[id]/rastreio-publico - Link para o destinatário acompanhar sem login.
// Pedidos novos já nascem com token; os antigos ganham um na primeira vez.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOrgAccess(['OWNER', 'DISPATCHER', 'CLIENT'])
    if (!auth.authenticated) return auth.response
    const { id } = await params

    const pedido = await prisma.pedido.findFirst({
      where: { id, organizationId: auth.user.organizationId },
      select: { id: true, organizationId: true, clienteId: true, motoboyId: true, trackingToken: true },
    })
    if (!pedido) return notFound('Pedido não encontrado')
    const acesso = await requirePedidoAccess(pedido)
    if (!acesso.authenticated) return acesso.response
    if (acesso.user.orgRole === 'DRIVER') return forbidden()

    let token = pedido.trackingToken
    if (!token) {
      token = gerarToken()
      // Condicional: duas requisições simultâneas não geram links diferentes
      const gravado = await prisma.pedido.updateMany({ where: { id, trackingToken: null }, data: { trackingToken: token } })
      if (gravado.count !== 1) token = (await prisma.pedido.findUniqueOrThrow({ where: { id }, select: { trackingToken: true } })).trackingToken!
      await registrarAuditoria({ acao: 'rastreio.link', entidade: 'Pedido', entidadeId: id, userId: auth.user.id, organizationId: auth.user.organizationId, request })
    }

    return jsonResponse({ success: true, data: { url: `${urlBase()}/r/${token}` } })
  } catch (error) {
    console.error('Erro ao gerar link de rastreio:', error)
    return serverError()
  }
}
