import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { updatePedidoStatusSchema } from '@/lib/validations'
import { ApiResponse, StatusPedido } from '@/types'
import { requirePedidoAccess, notFound, serverError, badRequest } from '@/lib/auth-helpers'

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
          include: {
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    return serverError('Erro ao buscar pedido')
  }
}

// PATCH /api/pedidos/[id] - Atualizar status do pedido (verificação de acesso)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Buscar pedido primeiro para verificar acesso
    const pedido = await prisma.pedido.findUnique({
      where: { id },
    })

    if (!pedido) {
      return notFound('Pedido não encontrado')
    }

    // Verificar se usuário tem acesso a este pedido
    const auth = await requirePedidoAccess(pedido)
    if (!auth.authenticated) return auth.response

    const body = await request.json()

    const validation = updatePedidoStatusSchema.safeParse(body)
    if (!validation.success) {
      return badRequest('Dados inválidos')
    }

    const data = validation.data

    // Validar transição de status
    const transicoesValidas: Record<StatusPedido, StatusPedido[]> = {
      SOLICITADO: ['ACEITO', 'CANCELADO'],
      ACEITO: ['EM_COLETA', 'CANCELADO'],
      EM_COLETA: ['EM_ENTREGA', 'CANCELADO'],
      EM_ENTREGA: ['ENTREGUE', 'CANCELADO'],
      ENTREGUE: [],
      CANCELADO: [],
    }

    if (!transicoesValidas[pedido.status].includes(data.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Não é possível mudar status de ${pedido.status} para ${data.status}`,
        },
        { status: 400 }
      )
    }

    // Preparar dados de atualização
    const updateData: Record<string, unknown> = {
      status: data.status,
    }

    // Adicionar timestamps e dados específicos conforme o status
    switch (data.status) {
      case 'ACEITO':
        if (!data.motoboyId) {
          return NextResponse.json(
            { success: false, error: 'motoboyId é obrigatório para aceitar pedido' },
            { status: 400 }
          )
        }

        // Verificar se motoboy existe e está disponível
        const motoboy = await prisma.motoboy.findUnique({
          where: { id: data.motoboyId },
        })

        if (!motoboy) {
          return NextResponse.json(
            { success: false, error: 'Motoboy não encontrado' },
            { status: 404 }
          )
        }

        if (motoboy.status !== 'DISPONIVEL') {
          return NextResponse.json(
            { success: false, error: 'Motoboy não está disponível' },
            { status: 400 }
          )
        }

        updateData.motoboyId = data.motoboyId
        updateData.aceitoEm = new Date()

        // Atualizar status do motoboy
        await prisma.motoboy.update({
          where: { id: data.motoboyId },
          data: { status: 'EM_ENTREGA' },
        })
        break

      case 'EM_COLETA':
        updateData.coletadoEm = new Date()
        break

      case 'ENTREGUE':
        updateData.entregueEm = new Date()

        // Dados de confirmação para documentos
        if (data.assinaturaRecebedor) {
          updateData.assinaturaRecebedor = data.assinaturaRecebedor
        }
        if (data.fotoComprovante) {
          updateData.fotoComprovante = data.fotoComprovante
        }

        // Atualizar status do motoboy para disponível e incrementar entregas
        if (pedido.motoboyId) {
          await prisma.motoboy.update({
            where: { id: pedido.motoboyId },
            data: {
              status: 'DISPONIVEL',
              totalEntregas: { increment: 1 },
              ultimaAtividade: new Date(),
            },
          })
        }
        break

      case 'CANCELADO':
        updateData.canceladoEm = new Date()
        if (data.motivoCancelamento) {
          updateData.motivoCancelamento = data.motivoCancelamento
        }

        // Se tinha motoboy atribuído, liberar ele
        if (pedido.motoboyId) {
          await prisma.motoboy.update({
            where: { id: pedido.motoboyId },
            data: {
              status: 'DISPONIVEL',
              ultimaAtividade: new Date(),
            },
          })
        }
        break
    }

    const updated = await prisma.pedido.update({
      where: { id },
      data: updateData,
      include: {
        cliente: {
          include: {
            user: {
              select: { nome: true, telefone: true },
            },
          },
        },
        motoboy: {
          include: {
            user: {
              select: { nome: true, telefone: true },
            },
          },
        },
        enderecoOrigem: true,
        enderecoDestino: true,
      },
    })

    const response: ApiResponse<typeof updated> = {
      success: true,
      data: updated,
      message: `Pedido ${data.status.toLowerCase().replace('_', ' ')} com sucesso`,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error)
    return serverError('Erro ao atualizar pedido')
  }
}

// DELETE /api/pedidos/[id] - Cancelar pedido (verificação de acesso)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const pedido = await prisma.pedido.findUnique({
      where: { id },
    })

    if (!pedido) {
      return notFound('Pedido não encontrado')
    }

    // Verificar se usuário tem acesso a este pedido
    const auth = await requirePedidoAccess(pedido)
    if (!auth.authenticated) return auth.response

    // Só pode cancelar pedidos que não foram entregues ou já cancelados
    if (['ENTREGUE', 'CANCELADO'].includes(pedido.status)) {
      return badRequest('Pedido não pode ser cancelado')
    }

    // Se tinha motoboy atribuído, liberar
    if (pedido.motoboyId) {
      await prisma.motoboy.update({
        where: { id: pedido.motoboyId },
        data: {
          status: 'DISPONIVEL',
          ultimaAtividade: new Date(),
        },
      })
    }

    const updated = await prisma.pedido.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        canceladoEm: new Date(),
        motivoCancelamento: body.motivoCancelamento || 'Cancelado pelo usuário',
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Pedido cancelado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error)
    return serverError('Erro ao cancelar pedido')
  }
}
