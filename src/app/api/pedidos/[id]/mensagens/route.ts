import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const mensagemSchema = z.object({
  conteudo: z.string().min(1, 'Mensagem não pode estar vazia').max(1000),
})

// GET /api/pedidos/[id]/mensagens - Listar mensagens do pedido
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verificar se o usuário tem acesso ao pedido
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: { select: { userId: true } },
        motoboy: { select: { userId: true } },
      },
    })

    if (!pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    const isCliente = pedido.cliente.userId === session.user.id
    const isMotoboy = pedido.motoboy?.userId === session.user.id
    const isAdmin = session.user.role === 'ADMIN'

    if (!isCliente && !isMotoboy && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Buscar mensagens
    const mensagens = await prisma.mensagem.findMany({
      where: { pedidoId: id },
      orderBy: { createdAt: 'asc' },
    })

    // Marcar mensagens como lidas
    const remetenteOposto = isCliente ? 'MOTOBOY' : 'CLIENTE'
    await prisma.mensagem.updateMany({
      where: {
        pedidoId: id,
        remetente: remetenteOposto,
        lida: false,
      },
      data: { lida: true },
    })

    return NextResponse.json({
      success: true,
      data: mensagens,
    })
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/pedidos/[id]/mensagens - Enviar mensagem
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Validar dados
    const validation = mensagemSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Mensagem inválida', details: validation.error.issues },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem acesso ao pedido
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: { select: { userId: true } },
        motoboy: { select: { userId: true } },
      },
    })

    if (!pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    const isCliente = pedido.cliente.userId === session.user.id
    const isMotoboy = pedido.motoboy?.userId === session.user.id

    if (!isCliente && !isMotoboy) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar se o pedido está em andamento
    if (['ENTREGUE', 'CANCELADO', 'SOLICITADO'].includes(pedido.status)) {
      return NextResponse.json(
        { success: false, error: 'Chat não disponível para este pedido' },
        { status: 400 }
      )
    }

    // Criar mensagem
    const mensagem = await prisma.mensagem.create({
      data: {
        pedidoId: id,
        remetente: isCliente ? 'CLIENTE' : 'MOTOBOY',
        conteudo: validation.data.conteudo,
      },
    })

    return NextResponse.json({
      success: true,
      data: mensagem,
    })
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
