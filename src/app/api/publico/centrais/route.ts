import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { applyRateLimit, serverError } from '@/lib/auth-helpers'
import { criarCentralSchema } from '@/lib/validations'
import { gerarSlug, vincularConta } from '@/lib/contas'
import { registrarAuditoria } from '@/lib/audit'
import { OperacaoError } from '@/lib/operacao-error'

// POST /api/publico/centrais - "Criar minha central" (público).
// A central nasce PENDENTE no plano Essencial; o dono já consegue entrar, mas só
// opera depois que a equipe da plataforma ativar.
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await applyRateLimit(request, 'auth')
    if (!rateLimit.success) return rateLimit.response

    const validation = criarCentralSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) {
      return jsonResponse({ success: false, error: 'Dados inválidos', details: validation.error.issues }, { status: 400 })
    }
    const data = validation.data

    const resultado = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          nome: data.nomeCentral, slug: await gerarSlug(tx, data.nomeCentral), plano: 'ESSENCIAL', status: 'PENDENTE',
          settings: { create: {} }, pricingRule: { create: {} },
        },
        select: { id: true, slug: true },
      })
      const { userId } = await vincularConta(tx, org.id, 'OWNER', data)
      return { ...org, userId }
    })

    await registrarAuditoria({
      acao: 'organizacao.criada', entidade: 'Organization', entidadeId: resultado.id,
      userId: resultado.userId, organizationId: resultado.id, request,
    })

    return jsonResponse({
      success: true,
      data: { slug: resultado.slug },
      message: 'Central criada! Nossa equipe vai ativar o acesso em breve. Você já pode entrar com seu e-mail e senha.',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao criar central:', error)
    return serverError('Erro ao criar central')
  }
}
