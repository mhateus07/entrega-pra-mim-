import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { updatePedidoStatusSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireAuth, requirePedidoAccess, notFound, serverError, badRequest } from '@/lib/auth-helpers'

import { alterarStatusPedido } from '@/lib/pedido-status'
import { OperacaoError } from '@/lib/operacao-error'
import { registrarAuditoria } from '@/lib/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/pedidos/[id] - Buscar pedido por ID (verificação de acesso)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: {
          include: {
            user: {
              select: { nome: true, email: true, telefone: true },
            },
          },
        },
        motoboy: {
          select: {
            id: true, avaliacaoMedia: true,
            user: {
              select: { nome: true, telefone: true },
            },
          },
        },
        enderecoOrigem: true,
        enderecoDestino: true,
        avaliacao: true,
        pagamento: {
          select: {
            id: true,
            metodo: true,
            status: true,
            valor: true,
            valorMotoboy: true,
            taxaPlataforma: true,
            cartaoUltimos4: true,
            cartaoBandeira: true,
            aprovadoEm: true,
            createdAt: true,
          },
        },
      },
    })

    if (!pedido) {
      return notFound('Pedido não encontrado')
    }

    // Verificar se usuário tem acesso a este pedido
    const auth = await requirePedidoAccess(pedido)
    if (!auth.authenticated) return auth.response

    const response: ApiResponse<typeof pedido> = {
      success: true,
      data: pedido,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    return serverError('Erro ao buscar pedido')
  }
}

// PATCH e DELETE compartilham autorização, transação e regras de cancelamento.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response
    const validation = updatePedidoStatusSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest('Dados inválidos')
    const { id } = await params
    const updated = await alterarStatusPedido(id, auth.user, validation.data)
    await registrarAuditoria({
      acao: 'pedido.status', entidade: 'Pedido', entidadeId: id, userId: auth.user.id, request,
      dados: { para: updated.status, ...(updated.motoboyId ? { motoboyId: updated.motoboyId } : {}) },
    })
    return jsonResponse({ success: true, data: updated, message: 'Pedido atualizado com sucesso' })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao atualizar pedido:', error)
    return serverError('Erro ao atualizar pedido')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response
    const body = await request.json().catch(() => ({}))
    const validation = updatePedidoStatusSchema.safeParse({
      status: 'CANCELADO', motivoCancelamento: body?.motivoCancelamento,
    })
    if (!validation.success) return badRequest('Dados inválidos')
    const { id } = await params
    const updated = await alterarStatusPedido(id, auth.user, validation.data)
    await registrarAuditoria({
      acao: 'pedido.status', entidade: 'Pedido', entidadeId: id, userId: auth.user.id, request,
      dados: { para: 'CANCELADO', motivo: updated.motivoCancelamento },
    })
    return jsonResponse({ success: true, data: updated, message: 'Pedido cancelado com sucesso' })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao cancelar pedido:', error)
    return serverError('Erro ao cancelar pedido')
  }
}
