import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireAuth, serverError } from '@/lib/auth-helpers'

// GET /api/organizacoes - Centrais em que o usuário pode entrar (seletor de central).
// Membro comum vê só as próprias; o superadmin vê todas.
export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response
    const { user } = auth

    const organizacoes = user.superadmin
      ? (await prisma.organization.findMany({
        select: { id: true, nome: true, slug: true, status: true },
        orderBy: { nome: 'asc' },
      })).map(o => ({ ...o, papel: null }))
      : (await prisma.organizationMember.findMany({
        where: { userId: user.id },
        select: { papel: true, organization: { select: { id: true, nome: true, slug: true, status: true } } },
        orderBy: { createdAt: 'asc' },
      })).map(m => ({ ...m.organization, papel: m.papel }))

    return jsonResponse({ success: true, data: organizacoes, ativa: user.organizationId })
  } catch (error) {
    console.error('Erro ao listar organizações:', error)
    return serverError('Erro ao listar organizações')
  }
}
