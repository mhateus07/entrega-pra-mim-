import { parsePagination, paginationMeta, enumFilter } from '@/lib/pagination'
import { OperacaoError } from '@/lib/operacao-error'
import { Prisma } from '@prisma/client'
import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createClienteSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireAdmin, serverError, applyRateLimit } from '@/lib/auth-helpers'

// GET /api/clientes - Listar clientes (ADMIN apenas)
export async function GET(request: NextRequest) {
  try {
    // Apenas admin pode listar todos os clientes
    const auth = await requireAdmin()
    if (!auth.authenticated) return auth.response

    const searchParams = request.nextUrl.searchParams
    const paging = parsePagination(searchParams)
    const tipoPessoa = enumFilter(searchParams.get('tipoPessoa'), ['PF', 'PJ'] as const)

    const where: Prisma.ClienteWhereInput = {}

    const busca = searchParams.get('q')?.trim().slice(0, 100)
    if (busca) where.user = { OR: [{ nome: { contains: busca } }, { email: { contains: busca } }, { telefone: { contains: busca } }] }
    if (tipoPessoa) {
      where.tipoPessoa = tipoPessoa
    }

    const clientes = await prisma.cliente.findMany({
      where, skip: paging.skip, take: paging.take,
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

        _count: {
          select: {
            pedidos: true,
            enderecos: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })

    const gastos = await prisma.pedido.groupBy({
      by: ['clienteId'], where: { clienteId: { in: clientes.map(c => c.id) }, status: 'ENTREGUE' }, _sum: { valorTotal: true },
    })
    const total = await prisma.cliente.count({ where })
    const response = {
      pagination: paginationMeta(paging.page, paging.pageSize, total),
      success: true,
      data: clientes.map(c => ({ ...c, totalGasto: gastos.find(g => g.clienteId === c.id)?._sum.valorTotal ?? 0 })),
    }

    return jsonResponse(response)
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao listar clientes:', error)
    return serverError('Erro ao listar clientes')
  }
}

// POST /api/clientes - Criar cliente (rate limited - registro)
export async function POST(request: NextRequest) {
  try {
    // Rate limit para registro (10 req/min)
    const rateLimit = await applyRateLimit(request, 'auth')
    if (!rateLimit.success) return rateLimit.response

    const body = await request.json()

    const validation = createClienteSchema.safeParse(body)
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

    // Verificar se CPF/CNPJ já existe (se fornecido)
    if (data.cpfCnpj) {
      const existingDoc = await prisma.cliente.findUnique({
        where: { cpfCnpj: data.cpfCnpj },
      })

      if (existingDoc) {
        return jsonResponse(
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

    return jsonResponse(response, { status: 201 })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao criar cliente:', error)
    return jsonResponse(
      { success: false, error: 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}
