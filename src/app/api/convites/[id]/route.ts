import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireGestor, notFound, serverError } from '@/lib/auth-helpers'
import { registrarAuditoria } from '@/lib/audit'

// DELETE /api/convites/[id] - Revoga um convite ainda não usado (o link para de funcionar)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    const { id } = await params
    const revogado = await prisma.convite.updateMany({
      where: { id, organizationId: auth.user.organizationId, usadoEm: null },
      data: { expiresAt: new Date() },
    })
    if (revogado.count !== 1) return notFound('Convite não encontrado')
    await registrarAuditoria({ acao: 'convite.revogado', entidade: 'Convite', entidadeId: id, userId: auth.user.id, organizationId: auth.user.organizationId, request })
    return jsonResponse({ success: true, message: 'Convite revogado' })
  } catch (error) {
    console.error('Erro ao revogar convite:', error)
    return serverError()
  }
}
