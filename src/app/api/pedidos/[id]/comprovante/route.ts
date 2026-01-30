import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/pedidos/[id]/comprovante - Upload de foto de comprovante
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

    // Verificar se é motoboy do pedido
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        motoboy: { select: { userId: true } },
      },
    })

    if (!pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    if (pedido.motoboy?.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar status do pedido
    if (pedido.status !== 'EM_ENTREGA') {
      return NextResponse.json(
        { success: false, error: 'Pedido não está em entrega' },
        { status: 400 }
      )
    }

    // Processar upload
    const formData = await request.formData()
    const file = formData.get('foto') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma foto enviada' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' },
        { status: 400 }
      )
    }

    // Validar tamanho (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Arquivo muito grande. Máximo 5MB.' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'comprovantes')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Gerar nome único para o arquivo
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${id}-${Date.now()}.${extension}`
    const filePath = path.join(uploadDir, fileName)

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // URL pública do arquivo
    const fotoUrl = `/uploads/comprovantes/${fileName}`

    // Atualizar pedido com URL da foto
    const pedidoAtualizado = await prisma.pedido.update({
      where: { id },
      data: { fotoComprovante: fotoUrl },
    })

    return NextResponse.json({
      success: true,
      data: {
        fotoUrl,
        pedidoId: pedidoAtualizado.id,
      },
      message: 'Comprovante enviado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao fazer upload do comprovante:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET /api/pedidos/[id]/comprovante - Buscar foto de comprovante
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

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: {
        fotoComprovante: true,
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

    return NextResponse.json({
      success: true,
      data: {
        fotoUrl: pedido.fotoComprovante,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar comprovante:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
