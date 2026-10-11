import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireGestor, requireOwner, badRequest, forbidden, serverError } from '@/lib/auth-helpers'
import { COR_VALIDA, marcaPermitida, marcaPublica } from '@/lib/marca'
import { registrarAuditoria } from '@/lib/audit'

const schema = z.object({
  nomeExibicao: z.string().trim().max(60).nullable(),
  corPrimaria: z.string().regex(COR_VALIDA, 'Cor no formato #RRGGBB').nullable(),
})

async function marcaDaOrg(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { slug: true, plano: true, settings: { select: { nomeExibicao: true, corPrimaria: true, logoArquivo: true } } },
  })
  return {
    disponivel: marcaPermitida(org.plano),
    slug: org.slug,
    nomeExibicao: org.settings?.nomeExibicao ?? null,
    corPrimaria: org.settings?.corPrimaria ?? null,
    temLogo: !!org.settings?.logoArquivo,
    publica: await marcaPublica(org.slug),
  }
}

// GET /api/organizacao/marca - Configuração de marca da central ativa
export async function GET() {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    return jsonResponse({ success: true, data: await marcaDaOrg(auth.user.organizationId) })
  } catch (error) {
    console.error('Erro ao ler marca:', error)
    return serverError()
  }
}

// PUT /api/organizacao/marca - Nome de exibição e cor (dono, plano Marca própria)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response
    const organizationId = auth.user.organizationId
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { plano: true } })
    if (!marcaPermitida(org.plano)) return forbidden('Marca própria está disponível no plano Marca própria')

    const validation = schema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest(validation.error.issues[0]?.message ?? 'Dados inválidos')
    const dados = { nomeExibicao: validation.data.nomeExibicao || null, corPrimaria: validation.data.corPrimaria?.toLowerCase() ?? null }
    await prisma.organizationSettings.upsert({ where: { organizationId }, create: { organizationId, ...dados }, update: dados })
    await registrarAuditoria({ acao: 'marca.alterada', entidade: 'Organization', entidadeId: organizationId, userId: auth.user.id, organizationId, request, dados })
    return jsonResponse({ success: true, data: await marcaDaOrg(organizationId), message: 'Marca atualizada' })
  } catch (error) {
    console.error('Erro ao salvar marca:', error)
    return serverError()
  }
}
