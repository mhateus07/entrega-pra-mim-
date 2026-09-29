import { parsePagination, paginationMeta, enumFilter } from '@/lib/pagination'
import { OperacaoError } from '@/lib/operacao-error'
import { Prisma } from '@prisma/client'
import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createMotoboySchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireAuth, serverError, applyRateLimit } from '@/lib/auth-helpers'

// GET /api/motoboys - Listar motoboys (autenticado)
export async function GET(request: NextRequest) {
  try {
    // Requer autenticação para listar motoboys
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const searchParams = request.nextUrl.searchParams
    const paging = parsePagination(searchParams)
    const status = enumFilter(searchParams.get('status'), ['DISPONIVEL', 'EM_ENTREGA', 'OFFLINE'] as const)
    const avaliacaoMinima = searchParams.get('avaliacaoMinima')

    const where: Prisma.MotoboyWhereInput = {}

    if (status) {
      where.status = status
    }

    if (avaliacaoMinima && (!Number.isFinite(Number(avaliacaoMinima)) || Number(avaliacaoMinima) < 0 || Number(avaliacaoMinima) > 5)) throw new OperacaoError('Avaliação inválida', 400)
    if (avaliacaoMinima) {
      where.avaliacaoMedia = {
        gte: parseFloat(avaliacaoMinima),
      }
    }

    // Para não-admins, limitar informações retornadas
    const isAdmin = auth.user.role === 'ADMIN'

    const motoboys = await prisma.motoboy.findMany({
      where, skip: paging.skip, take: paging.take,
      select: {
        id: true, status: true, veiculoTipo: true, avaliacaoMedia: true, totalEntregas: true,
        ...(isAdmin ? {
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

    const counts = await prisma.motoboy.groupBy({ by: ['status'], _count: { _all: true } })
    const summary = Object.fromEntries(counts.map(g => [g.status, g._count._all]))
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

// POST /api/motoboys - Criar motoboy (rate limited - registro)
export async function POST(request: NextRequest) {
  try {
    // Rate limit para registro (10 req/min)
    const rateLimit = applyRateLimit(request, 'auth')
    if (!rateLimit.success) return rateLimit.response

    const body = await request.json()

    const validation = createMotoboySchema.safeParse(body)
    if (!validation.success) {
      return jsonResponse(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return jsonResponse(
        { success: false, error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // Verificar se CNH já existe
    const existingCNH = await prisma.motoboy.findUnique({
      where: { cnh: data.cnh },
    })

    if (existingCNH) {
      return jsonResponse(
        { success: false, error: 'CNH já cadastrada' },
        { status: 400 }
      )
    }

    // Verificar se placa já existe
    const existingPlaca = await prisma.motoboy.findUnique({
      where: { veiculoPlaca: data.veiculoPlaca.toUpperCase() },
    })

    if (existingPlaca) {
      return jsonResponse(
        { success: false, error: 'Placa já cadastrada' },
        { status: 400 }
      )
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(data.senha, 10)

    // Criar usuário e motoboy em transação
    const result = await prisma.// eslint-disable-next-line @typescript-eslint/no-explicit-any
$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          senha: senhaHash,
          nome: data.nome,
          telefone: data.telefone,
          role: 'MOTOBOY',
        },
      })

      const motoboy = await tx.motoboy.create({
        data: {
          userId: user.id,
          cnh: data.cnh,
          veiculoTipo: data.veiculoTipo,
          veiculoMarca: data.veiculoMarca,
          veiculoModelo: data.veiculoModelo,
          veiculoPlaca: data.veiculoPlaca.toUpperCase(),
        },
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
            },
          },
        },
      })

      return motoboy
    })

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Motoboy cadastrado com sucesso',
    }

    return jsonResponse(response, { status: 201 })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao criar motoboy:', error)
    return jsonResponse(
      { success: false, error: 'Erro ao criar motoboy' },
      { status: 500 }
    )
  }
}
