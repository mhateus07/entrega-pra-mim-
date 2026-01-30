import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verificarStatusPix, cancelarPagamento } from '@/lib/pagamentos'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/pagamentos/[id] - Buscar pagamento
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

    const pagamento = await prisma.pagamento.findUnique({
      where: { id },
      include: {
        pedido: {
          select: {
            id: true,
            status: true,
            tipoServico: true,
            valorTotal: true,
          },
        },
        cliente: {
          select: {
            user: { select: { nome: true } },
          },
        },
      },
    })

    if (!pagamento) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão
    const isOwner = pagamento.cliente.user !== null
    const isAdmin = session.user.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: pagamento,
    })
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/pagamentos/[id] - Verificar status (PIX) ou confirmar (Dinheiro)
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
    const body = await request.json()
    const { acao } = body // 'verificar' | 'confirmar_dinheiro'

    const pagamento = await prisma.pagamento.findUnique({
      where: { id },
      include: {
        pedido: { select: { motoboyId: true } },
      },
    })

    if (!pagamento) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar status do PIX
    if (acao === 'verificar' && pagamento.metodo === 'PIX') {
      if (pagamento.status !== 'PENDENTE') {
        return NextResponse.json({
          success: true,
          data: { status: pagamento.status },
          message: `Pagamento já está ${pagamento.status.toLowerCase()}`,
        })
      }

      // Verificar com gateway
      const novoStatus = await verificarStatusPix(pagamento.gatewayId || '')

      if (novoStatus !== pagamento.status) {
        const updated = await prisma.pagamento.update({
          where: { id },
          data: {
            status: novoStatus,
            aprovadoEm: novoStatus === 'APROVADO' ? new Date() : null,
            canceladoEm: novoStatus === 'CANCELADO' ? new Date() : null,
          },
        })

        // Se aprovado, creditar motoboy
        if (novoStatus === 'APROVADO' && pagamento.pedido.motoboyId) {
          await creditarMotoboy(
            pagamento.pedido.motoboyId,
            pagamento.valorMotoboy,
            pagamento.pedidoId
          )
        }

        return NextResponse.json({
          success: true,
          data: { status: updated.status },
          message: novoStatus === 'APROVADO' ? 'Pagamento confirmado!' : `Status: ${novoStatus}`,
        })
      }

      return NextResponse.json({
        success: true,
        data: { status: pagamento.status },
        message: 'Aguardando pagamento',
      })
    }

    // Confirmar pagamento em dinheiro (apenas motoboy)
    if (acao === 'confirmar_dinheiro' && pagamento.metodo === 'DINHEIRO') {
      if (session.user.role !== 'MOTOBOY' && session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Apenas motoboy pode confirmar' },
          { status: 403 }
        )
      }

      const updated = await prisma.pagamento.update({
        where: { id },
        data: {
          status: 'APROVADO',
          aprovadoEm: new Date(),
        },
      })

      // Creditar motoboy
      if (pagamento.pedido.motoboyId) {
        await creditarMotoboy(
          pagamento.pedido.motoboyId,
          pagamento.valorMotoboy,
          pagamento.pedidoId
        )
      }

      return NextResponse.json({
        success: true,
        data: { status: updated.status },
        message: 'Pagamento em dinheiro confirmado',
      })
    }

    return NextResponse.json(
      { success: false, error: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro ao processar ação:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/pagamentos/[id] - Cancelar pagamento
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const pagamento = await prisma.pagamento.findUnique({
      where: { id },
    })

    if (!pagamento) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    // Só pode cancelar se estiver pendente
    if (pagamento.status !== 'PENDENTE') {
      return NextResponse.json(
        { success: false, error: 'Pagamento não pode ser cancelado' },
        { status: 400 }
      )
    }

    // Cancelar no gateway
    if (pagamento.gatewayId) {
      await cancelarPagamento(pagamento.gatewayId)
    }

    const updated = await prisma.pagamento.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        canceladoEm: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Pagamento cancelado',
    })
  } catch (error) {
    console.error('Erro ao cancelar pagamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para creditar motoboy
async function creditarMotoboy(
  motoboyId: string,
  valor: number,
  pedidoId: string
) {
  // Atualizar saldo
  await prisma.saldoMotoboy.upsert({
    where: { motoboyId },
    create: {
      motoboyId,
      saldoPendente: valor,
      totalRecebido: valor,
    },
    update: {
      saldoPendente: { increment: valor },
      totalRecebido: { increment: valor },
    },
  })

  // Registrar transação
  await prisma.transacaoMotoboy.create({
    data: {
      motoboyId,
      pedidoId,
      tipo: 'CREDITO',
      valor,
      descricao: `Entrega #${pedidoId.slice(0, 8)}`,
      status: 'PENDENTE',
    },
  })
}
