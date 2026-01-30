import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/motoboys/[id]/transacoes - Listar transações do motoboy
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
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Verificar se é o próprio motoboy ou admin
    if (session.user.motoboyId !== id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { motoboyId: id }

    if (tipo) {
      where.tipo = tipo
    }

    if (status) {
      where.status = status
    }

    const transacoes = await prisma.transacaoMotoboy.findMany({
      where,
      include: {
        pedido: {
          select: {
            id: true,
            tipoServico: true,
            valorTotal: true,
            entregueEm: true,
            enderecoOrigem: {
              select: { bairro: true, cidade: true },
            },
            enderecoDestino: {
              select: { bairro: true, cidade: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Calcular totais
    const totais = await prisma.transacaoMotoboy.groupBy({
      by: ['tipo'],
      where: { motoboyId: id },
      _sum: { valor: true },
    })

    const totalCreditos = totais.find(t => t.tipo === 'CREDITO')?._sum.valor || 0
    const totalDebitos = totais.find(t => t.tipo === 'DEBITO')?._sum.valor || 0
    const totalSaques = totais.find(t => t.tipo === 'SAQUE')?._sum.valor || 0

    return NextResponse.json({
      success: true,
      data: {
        transacoes,
        totais: {
          creditos: totalCreditos,
          debitos: totalDebitos,
          saques: totalSaques,
          liquido: totalCreditos - totalDebitos - totalSaques,
        },
      },
    })
  } catch (error) {
    console.error('Erro ao listar transações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
