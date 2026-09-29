import { Prisma } from '@prisma/client'
import { parsePagination, paginationMeta, enumFilter } from '@/lib/pagination'
import { OperacaoError } from '@/lib/operacao-error'
import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
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
      return jsonResponse(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tipo = enumFilter(searchParams.get('tipo'), ['CREDITO', 'DEBITO', 'SAQUE'] as const)
    const status = enumFilter(searchParams.get('status'), ['PENDENTE', 'CONCLUIDO', 'PROCESSADO', 'CANCELADO'] as const)
    const paging = parsePagination(searchParams)

    // Verificar se é o próprio motoboy ou admin
    if (session.user.motoboyId !== id && session.user.role !== 'ADMIN') {
      return jsonResponse(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const where: Prisma.TransacaoMotoboyWhereInput = { motoboyId: id }

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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: paging.take, skip: paging.skip,
    })

    // Calcular totais
    const totais = await prisma.transacaoMotoboy.groupBy({
      by: ['tipo'],
      where: { motoboyId: id, status: { in: ['CONCLUIDO', 'PROCESSADO'] } },
      _sum: { valor: true },
    })

    const totalCreditos = totais.find(t => t.tipo === 'CREDITO')?._sum.valor ?? new Prisma.Decimal(0)
    const totalDebitos = totais.find(t => t.tipo === 'DEBITO')?._sum.valor ?? new Prisma.Decimal(0)
    const totalSaques = totais.find(t => t.tipo === 'SAQUE')?._sum.valor ?? new Prisma.Decimal(0)

    const total = await prisma.transacaoMotoboy.count({ where })
    return jsonResponse({
      pagination: paginationMeta(paging.page, paging.pageSize, total),
      success: true,
      data: {
        transacoes,
        totais: {
          creditos: totalCreditos,
          debitos: totalDebitos,
          saques: totalSaques,
          liquido: totalCreditos.minus(totalDebitos).minus(totalSaques),
        },
      },
    })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao listar transações:', error)
    return jsonResponse(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
