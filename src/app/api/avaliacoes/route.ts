import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { createAvaliacaoSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { Prisma } from '@prisma/client'
import { parsePagination, paginationMeta } from '@/lib/pagination'
import { requireAuth, requireClienteOwnership, serverError, badRequest, notFound, forbidden } from '@/lib/auth-helpers'

// Campos públicos de uma avaliação: nada de CNH, placa, localização ou dados do pedido
const avaliacaoSelect = {
  id: true, pedidoId: true, motoboyId: true, nota: true, comentario: true, createdAt: true,
  pedido: { select: { id: true, tipoServico: true, createdAt: true, cliente: { select: { user: { select: { nome: true } } } } } },
  motoboy: { select: { id: true, user: { select: { nome: true } } } },
} satisfies Prisma.AvaliacaoSelect

// GET /api/avaliacoes - Listar avaliações
// Cliente vê as avaliações dos próprios pedidos; motoboy, as que recebeu; admin, todas.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const searchParams = request.nextUrl.searchParams
    const paging = parsePagination(searchParams)
    const motoboyId = searchParams.get('motoboyId')
    const { user } = auth

    const where: Prisma.AvaliacaoWhereInput = {}
    if (user.role === 'ADMIN') {
      if (motoboyId) where.motoboyId = motoboyId
    } else if (user.role === 'MOTOBOY' && user.motoboyId) {
      where.motoboyId = user.motoboyId
    } else if (user.role === 'CLIENTE' && user.clienteId) {
      where.pedido = { clienteId: user.clienteId }
      if (motoboyId) where.motoboyId = motoboyId
    } else {
      return forbidden('Acesso não permitido')
    }

    const [avaliacoes, total] = await Promise.all([
      prisma.avaliacao.findMany({
        where, select: avaliacaoSelect, skip: paging.skip, take: paging.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.avaliacao.count({ where }),
    ])

    return jsonResponse({
      success: true,
      data: avaliacoes,
      pagination: paginationMeta(paging.page, paging.pageSize, total),
    })
  } catch (error) {
    console.error('Erro ao listar avaliações:', error)
    return serverError('Erro ao listar avaliações')
  }
}

// POST /api/avaliacoes - Criar avaliação (apenas o cliente do pedido)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = createAvaliacaoSchema.safeParse(body)
    if (!validation.success) {
      return badRequest('Dados inválidos')
    }

    const data = validation.data

    // Verificar se pedido existe e está entregue
    const pedido = await prisma.pedido.findUnique({
      where: { id: data.pedidoId },
      include: { avaliacao: true },
    })

    if (!pedido) {
      return notFound('Pedido não encontrado')
    }

    // Verificar se é o cliente do pedido
    const auth = await requireClienteOwnership(pedido.clienteId)
    if (!auth.authenticated) return auth.response

    if (pedido.status !== 'ENTREGUE') {
      return badRequest('Só é possível avaliar pedidos entregues')
    }

    if (pedido.avaliacao) {
      return badRequest('Pedido já foi avaliado')
    }

    if (!pedido.motoboyId) {
      return badRequest('Pedido não possui motoboy atribuído')
    }

    // Criar avaliação
    const avaliacao = await prisma.avaliacao.create({
      data: {
        pedidoId: data.pedidoId,
        motoboyId: pedido.motoboyId,
        nota: data.nota,
        comentario: data.comentario,
      },
      select: avaliacaoSelect,
    })

    // Recalcular média do motoboy
    const todasAvaliacoes = await prisma.avaliacao.findMany({
      where: { motoboyId: pedido.motoboyId },
      select: { nota: true },
    })

    const somaNotas = todasAvaliacoes.reduce((acc: number, av: { nota: number }) => acc + av.nota, 0)
    const mediaNotas = somaNotas / todasAvaliacoes.length

    await prisma.motoboy.update({
      where: { id: pedido.motoboyId },
      data: { avaliacaoMedia: Number(mediaNotas.toFixed(2)) },
    })

    const response: ApiResponse<typeof avaliacao> = {
      success: true,
      data: avaliacao,
      message: 'Avaliação registrada com sucesso',
    }

    return jsonResponse(response, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar avaliação:', error)
    return serverError('Erro ao criar avaliação')
  }
}
