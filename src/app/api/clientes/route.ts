import { parsePagination, paginationMeta, enumFilter } from '@/lib/pagination'
import { OperacaoError } from '@/lib/operacao-error'
import { Prisma } from '@prisma/client'
import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { createClienteSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireGestor, serverError, applyRateLimit } from '@/lib/auth-helpers'
import { vincularConta, criarPerfilCliente } from '@/lib/contas'


// GET /api/clientes - Listar clientes da central (gestão)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response

    const searchParams = request.nextUrl.searchParams
    const paging = parsePagination(searchParams)
    const tipoPessoa = enumFilter(searchParams.get('tipoPessoa'), ['PF', 'PJ'] as const)

    const where: Prisma.ClienteWhereInput = { organizationId: auth.user.organizationId }

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
      by: ['clienteId'], where: { organizationId: auth.user.organizationId, clienteId: { in: clientes.map(c => c.id) }, status: 'ENTREGUE' }, _sum: { valorTotal: true },
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

// POST /api/clientes - A central cadastra um cliente diretamente (gestão).
// O caminho normal é o convite (/api/convites); este serve para a implantação.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    const rateLimit = await applyRateLimit(request, 'sensitive', auth.user.id)
    if (!rateLimit.success) return rateLimit.response

    const validation = createClienteSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) {
      return jsonResponse({ success: false, error: 'Dados inválidos', details: validation.error.issues }, { status: 400 })
    }
    const data = validation.data
    const organizationId = auth.user.organizationId

    const cliente = await prisma.$transaction(async (tx) => {
      const { userId } = await vincularConta(tx, organizationId, 'CLIENT', data)
      return criarPerfilCliente(tx, organizationId, userId, data)
    })

    const response: ApiResponse<typeof cliente> = {
      success: true,
      data: cliente,
      message: 'Cliente cadastrado com sucesso',
    }
    return jsonResponse(response, { status: 201 })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao criar cliente:', error)
    return serverError('Erro ao criar cliente')
  }
}
