import { parsePagination, paginationMeta, enumFilter } from '@/lib/pagination'
import { OperacaoError } from '@/lib/operacao-error'
import { Prisma } from '@prisma/client'
import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { createMotoboySchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireOrgAccess, requireGestor, isGestor, serverError, applyRateLimit } from '@/lib/auth-helpers'
import { vincularConta, criarPerfilMotoboy } from '@/lib/contas'
import { registrarAuditoria } from '@/lib/audit'
import { verificarLimiteMotoboys } from '@/lib/uso'


// GET /api/motoboys - Listar motoboys (autenticado)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response

    const searchParams = request.nextUrl.searchParams
    const paging = parsePagination(searchParams)
    const status = enumFilter(searchParams.get('status'), ['DISPONIVEL', 'EM_ENTREGA', 'OFFLINE'] as const)
    const avaliacaoMinima = searchParams.get('avaliacaoMinima')
    const aprovacao = enumFilter(searchParams.get('aprovacao'), ['PENDENTE_APROVACAO', 'APROVADO', 'REPROVADO', 'SUSPENSO'] as const)

    // Para não-admins, limitar informações retornadas
    const isAdmin = isGestor(auth.user)
    const organizationId = auth.user.organizationId

    // Fora da gestão da central, só aparecem motoboys aprovados
    const where: Prisma.MotoboyWhereInput = isAdmin
      ? { organizationId, ...(aprovacao ? { aprovacao } : {}) }
      : { organizationId, aprovacao: 'APROVADO' }

    if (status) {
      where.status = status
    }

    if (avaliacaoMinima && (!Number.isFinite(Number(avaliacaoMinima)) || Number(avaliacaoMinima) < 0 || Number(avaliacaoMinima) > 5)) throw new OperacaoError('Avaliação inválida', 400)
    if (avaliacaoMinima) {
      where.avaliacaoMedia = {
        gte: parseFloat(avaliacaoMinima),
      }
    }

    const motoboys = await prisma.motoboy.findMany({
      where, skip: paging.skip, take: paging.take,
      select: {
        id: true, status: true, veiculoTipo: true, avaliacaoMedia: true, totalEntregas: true,
        ...(isAdmin ? {
          aprovacao: true, aprovacaoEm: true, motivoAprovacao: true,
          userId: true, cnh: true, veiculoMarca: true, veiculoModelo: true, veiculoPlaca: true,
          latitudeAtual: true, longitudeAtual: true, ultimaAtividade: true, createdAt: true, updatedAt: true,
        } : {}),
        user: {
          select: {
            id: true,
            nome: true,
            // Apenas admin vê email e telefone
            ...(isAdmin ? { email: true, telefone: true } : {}),
          },
        },
        disponibilidades: isAdmin,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })

    const counts = await prisma.motoboy.groupBy({
      by: ['status'], _count: { _all: true }, where: isAdmin ? { organizationId } : { organizationId, aprovacao: 'APROVADO' },
    })
    const summary: Record<string, number> = Object.fromEntries(counts.map(g => [g.status, g._count._all]))
    // Admin recebe também a fila de cadastros aguardando aprovação
    if (isAdmin) summary.PENDENTE_APROVACAO = await prisma.motoboy.count({ where: { organizationId, aprovacao: 'PENDENTE_APROVACAO' } })
    const total = await prisma.motoboy.count({ where })
    const response = {
      summary,
      pagination: paginationMeta(paging.page, paging.pageSize, total),
      success: true,
      data: motoboys,
    }

    return jsonResponse(response)
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao listar motoboys:', error)
    return serverError('Erro ao listar motoboys')
  }
}

// POST /api/motoboys - A central cadastra um motoboy diretamente (gestão).
// Nasce PENDENTE_APROVACAO como no convite; o caminho normal é /api/convites.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    const rateLimit = await applyRateLimit(request, 'sensitive', auth.user.id)
    if (!rateLimit.success) return rateLimit.response

    const validation = createMotoboySchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) {
      return jsonResponse({ success: false, error: 'Dados inválidos', details: validation.error.issues }, { status: 400 })
    }
    const data = validation.data
    const organizationId = auth.user.organizationId
    // Pendentes também ocupam vaga do plano
    await verificarLimiteMotoboys(organizationId, true)

    const motoboy = await prisma.$transaction(async (tx) => {
      const { userId } = await vincularConta(tx, organizationId, 'DRIVER', data)
      return criarPerfilMotoboy(tx, organizationId, userId, data)
    })

    await registrarAuditoria({
      acao: 'motoboy.cadastro', entidade: 'Motoboy', entidadeId: motoboy.id,
      userId: auth.user.id, organizationId, request,
    })

    const response: ApiResponse<typeof motoboy> = {
      success: true,
      data: motoboy,
      message: 'Motoboy cadastrado. Aprove o cadastro para ele começar a receber pedidos.',
    }
    return jsonResponse(response, { status: 201 })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao criar motoboy:', error)
    return serverError('Erro ao criar motoboy')
  }
}
