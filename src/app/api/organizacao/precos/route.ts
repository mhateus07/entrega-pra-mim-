import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireOrgAccess, requireOwner, badRequest, serverError } from '@/lib/auth-helpers'
import { carregarRegraPreco } from '@/lib/pricing-org'
import { normalizarBairro } from '@/lib/pricing'
import { tabelaPrecoSchema } from '@/lib/validations'

async function tabela(organizationId: string) {
  const [regra, bairros, settings] = await Promise.all([
    carregarRegraPreco(organizationId),
    prisma.pricingBairro.findMany({ where: { organizationId }, select: { nome: true, valor: true }, orderBy: { nome: 'asc' } }),
    prisma.organizationSettings.findUnique({ where: { organizationId }, select: { repasseMotoboy: true, fusoHorario: true } }),
  ])
  return {
    precoPorKm: regra.precoPorKm, valorMinimo: regra.valorMinimo, multiplicadores: regra.multiplicadores, bairros,
    repasseMotoboy: settings ? settings.repasseMotoboy.toNumber() : 0.7,
    fusoHorario: settings?.fusoHorario ?? 'America/Sao_Paulo',
  }
}

// GET /api/organizacao/precos - Tabela de preço da central (qualquer membro: o cliente vê a estimativa)
export async function GET() {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response
    return jsonResponse({ success: true, data: await tabela(auth.user.organizationId) })
  } catch (error) {
    console.error('Erro ao ler tabela de preço:', error)
    return serverError('Erro ao ler tabela de preço')
  }
}

// PUT /api/organizacao/precos - Substitui a tabela de preço (apenas o dono).
// Vale para pedidos novos; os já criados mantêm o preço congelado.
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response

    const validation = tabelaPrecoSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest(validation.error.issues[0]?.message ?? 'Dados inválidos')
    const { precoPorKm, valorMinimo, multiplicadores, bairros, repasseMotoboy } = validation.data

    const porChave = new Map(bairros.map(b => [normalizarBairro(b.nome), b]))
    if (porChave.size !== bairros.length) return badRequest('Há bairros repetidos na tabela')

    const organizationId = auth.user.organizationId
    const dados = {
      precoPorKm, valorMinimo,
      multAgendada: multiplicadores.AGENDADA, multDocumentos: multiplicadores.DOCUMENTOS, multExpressa: multiplicadores.EXPRESSA,
    }
    await prisma.$transaction([
      prisma.pricingRule.upsert({ where: { organizationId }, create: { organizationId, ...dados }, update: dados }),
      prisma.pricingBairro.deleteMany({ where: { organizationId } }),
      prisma.pricingBairro.createMany({
        data: [...porChave].map(([bairro, b]) => ({ organizationId, bairro, nome: b.nome, valor: b.valor })),
      }),
      ...(repasseMotoboy !== undefined ? [prisma.organizationSettings.upsert({
        where: { organizationId }, create: { organizationId, repasseMotoboy }, update: { repasseMotoboy },
      })] : []),
    ])

    return jsonResponse({ success: true, data: await tabela(organizationId), message: 'Tabela de preço atualizada' })
  } catch (error) {
    console.error('Erro ao salvar tabela de preço:', error)
    return serverError('Erro ao salvar tabela de preço')
  }
}
