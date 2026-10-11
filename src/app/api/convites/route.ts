import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireGestor, badRequest, forbidden, serverError } from '@/lib/auth-helpers'
import { criarConviteSchema } from '@/lib/validations'
import { gerarToken, hashToken, urlBase } from '@/lib/tokens'
import { registrarAuditoria } from '@/lib/audit'

// GET /api/convites - Convites da central (sem o token, que só aparece na criação)
export async function GET() {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    const convites = await prisma.convite.findMany({
      where: { organizationId: auth.user.organizationId },
      select: { id: true, papel: true, email: true, nome: true, expiresAt: true, usadoEm: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const agora = new Date()
    return jsonResponse({
      success: true,
      data: convites.map(c => ({ ...c, situacao: c.usadoEm ? 'USADO' : c.expiresAt <= agora ? 'EXPIRADO' : 'PENDENTE' })),
    })
  } catch (error) {
    console.error('Erro ao listar convites:', error)
    return serverError()
  }
}

// POST /api/convites - Gera o link de convite (dono e despachante; despachante só o dono convida)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    const validation = criarConviteSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest(validation.error.issues[0]?.message ?? 'Dados inválidos')
    const { papel, email, nome, validadeDias } = validation.data
    if (papel === 'DISPATCHER' && auth.user.orgRole !== 'OWNER') return forbidden('Somente o dono convida despachantes')

    const token = gerarToken()
    const convite = await prisma.convite.create({
      data: {
        organizationId: auth.user.organizationId, papel, email: email?.toLowerCase() ?? null, nome: nome || null,
        tokenHash: hashToken(token), expiresAt: new Date(Date.now() + validadeDias * 86_400_000), criadoPorId: auth.user.id,
      },
      select: { id: true, papel: true, expiresAt: true },
    })
    await registrarAuditoria({
      acao: 'convite.criado', entidade: 'Convite', entidadeId: convite.id, userId: auth.user.id,
      organizationId: auth.user.organizationId, request, dados: { papel },
    })
    return jsonResponse({ success: true, data: { ...convite, url: `${urlBase()}/convite/${token}` } }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar convite:', error)
    return serverError()
  }
}
