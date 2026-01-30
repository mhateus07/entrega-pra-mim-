import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createClienteSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'

// GET /api/clientes - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tipoPessoa = searchParams.get('tipoPessoa')

    const where: Record<string, unknown> = {}

    if (tipoPessoa) {
      where.tipoPessoa = tipoPessoa
    }

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            createdAt: true,
          },
        },
        enderecos: {
          where: { favorito: true },
          take: 1,
        },
        pedidos: {
          select: {
            valorTotal: true,
            status: true,
          },
        },
        _count: {
          select: {
            pedidos: true,
            enderecos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const response: ApiResponse<typeof clientes> = {
      success: true,
      data: clientes,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao listar clientes:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar clientes' },
      { status: 500 }
    )
  }
}

// POST /api/clientes - Criar cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = createClienteSchema.safeParse(body)
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

    // Verificar se CPF/CNPJ já existe (se fornecido)
    if (data.cpfCnpj) {
      const existingDoc = await prisma.cliente.findUnique({
        where: { cpfCnpj: data.cpfCnpj },
      })

      if (existingDoc) {
        return NextResponse.json(
          { success: false, error: 'CPF/CNPJ já cadastrado' },
          { status: 400 }
        )
      }
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(data.senha, 10)

    // Criar usuário e cliente em transação
    const result = await prisma.// eslint-disable-next-line @typescript-eslint/no-explicit-any
$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          senha: senhaHash,
          nome: data.nome,
          telefone: data.telefone,
          role: 'CLIENTE',
        },
      })

      const cliente = await tx.cliente.create({
        data: {
          userId: user.id,
          cpfCnpj: data.cpfCnpj,
          tipoPessoa: data.tipoPessoa,
          razaoSocial: data.razaoSocial,
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

      return cliente
    })

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Cliente cadastrado com sucesso',
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}
