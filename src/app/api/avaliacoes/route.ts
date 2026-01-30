import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createAvaliacaoSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'

// GET /api/avaliacoes - Listar avaliações
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const motoboyId = searchParams.get('motoboyId')

    const where: Record<string, unknown> = {}

    if (motoboyId) {
      where.motoboyId = motoboyId
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
    return NextResponse.json(
      { success: false, error: 'Erro ao listar avaliações' },
      { status: 500 }
    )
  }
}

// POST /api/avaliacoes - Criar avaliação
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = createAvaliacaoSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar se pedido existe e está entregue
    const pedido = await prisma.pedido.findUnique({
      where: { id: data.pedidoId },
      include: { avaliacao: true },
    })

    if (!pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    if (pedido.status !== 'ENTREGUE') {
      return NextResponse.json(
        { success: false, error: 'Só é possível avaliar pedidos entregues' },
        { status: 400 }
      )
    }

    if (pedido.avaliacao) {
      return NextResponse.json(
        { success: false, error: 'Pedido já foi avaliado' },
        { status: 400 }
      )
    }

    if (!pedido.motoboyId) {
      return NextResponse.json(
        { success: false, error: 'Pedido não possui motoboy atribuído' },
        { status: 400 }
      )
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
    return NextResponse.json(
      { success: false, error: 'Erro ao criar avaliação' },
      { status: 500 }
    )
  }
}
