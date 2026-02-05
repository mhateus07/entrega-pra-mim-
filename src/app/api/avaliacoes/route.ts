import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createAvaliacaoSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireAuth, requireClienteOwnership, serverError, badRequest, notFound, forbidden } from '@/lib/auth-helpers'

// GET /api/avaliacoes - Listar avaliações (autenticado)
export async function GET(request: NextRequest) {
  try {
    // Requer autenticação
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const searchParams = request.nextUrl.searchParams
    const motoboyId = searchParams.get('motoboyId')

    const where: Record<string, unknown> = {}

    if (motoboyId) {
      where.motoboyId = motoboyId
    }

    // Motoboy só vê suas próprias avaliações
    if (auth.user.role === 'MOTOBOY' && auth.user.motoboyId) {
      where.motoboyId = auth.user.motoboyId
    }

    const avaliacoes = await prisma.avaliacao.findMany({
      where,
      include: {
        pedido: {
          include: {
            cliente: {
              include: {
                user: {
                  select: { nome: true },
                },
              },
            },
          },
        },
        motoboy: {
          include: {
            user: {
              select: { nome: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const response: ApiResponse<typeof avaliacoes> = {
      success: true,
      data: avaliacoes,
    }

    return NextResponse.json(response)
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
      include: {
        pedido: true,
        motoboy: {
          include: {
            user: {
              select: { nome: true },
            },
          },
        },
      },
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

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar avaliação:', error)
    return serverError('Erro ao criar avaliação')
  }
}
