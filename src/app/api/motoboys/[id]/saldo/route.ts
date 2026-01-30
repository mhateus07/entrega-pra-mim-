import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/motoboys/[id]/saldo - Buscar saldo do motoboy
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

    // Verificar se é o próprio motoboy ou admin
    if (session.user.motoboyId !== id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Buscar ou criar saldo
    const saldo = await prisma.saldoMotoboy.upsert({
      where: { motoboyId: id },
      create: {
        motoboyId: id,
        saldoDisponivel: 0,
        saldoPendente: 0,
        totalRecebido: 0,
      },
      update: {},
    })

    return NextResponse.json({
      success: true,
      data: saldo,
    })
  } catch (error) {
    console.error('Erro ao buscar saldo:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
