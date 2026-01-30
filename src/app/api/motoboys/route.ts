import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createMotoboySchema } from '@/lib/validations'
import { ApiResponse } from '@/types'

// GET /api/motoboys - Listar motoboys
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const avaliacaoMinima = searchParams.get('avaliacaoMinima')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (avaliacaoMinima) {
      where.avaliacaoMedia = {
        gte: parseFloat(avaliacaoMinima),
      }
    }

    const motoboys = await prisma.motoboy.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        disponibilidades: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const response: ApiResponse<typeof motoboys> = {
      success: true,
      data: motoboys,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao listar motoboys:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar motoboys' },
      { status: 500 }
    )
  }
}

// POST /api/motoboys - Criar motoboy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = createMotoboySchema.safeParse(body)
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

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // Verificar se CNH já existe
    const existingCNH = await prisma.motoboy.findUnique({
      where: { cnh: data.cnh },
    })

    if (existingCNH) {
      return NextResponse.json(
        { success: false, error: 'CNH já cadastrada' },
        { status: 400 }
      )
    }

    // Verificar se placa já existe
    const existingPlaca = await prisma.motoboy.findUnique({
      where: { veiculoPlaca: data.veiculoPlaca.toUpperCase() },
    })

    if (existingPlaca) {
      return NextResponse.json(
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

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar motoboy:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar motoboy' },
      { status: 500 }
    )
  }
}
