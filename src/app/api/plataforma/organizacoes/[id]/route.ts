import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireSuperadmin, badRequest, notFound, serverError } from '@/lib/auth-helpers'
import { registrarAuditoria } from '@/lib/audit'

const schema = z.object({
  status: z.enum(['PENDENTE', 'ATIVA', 'SUSPENSA']).optional(),
  plano: z.enum(['ESSENCIAL', 'CENTRAL', 'MARCA_PROPRIA']).optional(),
}).refine(d => d.status || d.plano, 'Informe status ou plano')

// PATCH /api/plataforma/organizacoes/[id] - Ativar, suspender ou mudar o plano de uma central
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperadmin()
    if (!auth.authenticated) return auth.response
    const validation = schema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest(validation.error.issues[0]?.message ?? 'Dados inválidos')
    const { id } = await params
    const antes = await prisma.organization.findUnique({ where: { id }, select: { status: true, plano: true } })
    if (!antes) return notFound('Central não encontrada')
    const org = await prisma.organization.update({ where: { id }, data: validation.data, select: { id: true, status: true, plano: true } })
    await registrarAuditoria({
      acao: 'organizacao.alterada', entidade: 'Organization', entidadeId: id, userId: auth.user.id, organizationId: id, request,
      dados: { de: antes, para: validation.data },
    })
    return jsonResponse({ success: true, data: org })
  } catch (error) {
    console.error('Erro ao alterar central:', error)
    return serverError()
  }
}
