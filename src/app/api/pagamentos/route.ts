import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import {
  gerarPagamentoPix,
  processarPagamentoCartao,
  calcularTaxaPlataforma,
  calcularValorMotoboy,
  MetodoPagamento,
} from '@/lib/pagamentos'

const criarPagamentoSchema = z.object({
  pedidoId: z.string(),
  metodo: z.enum(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO']),
  cartao: z
    .object({
      numero: z.string(),
      nome: z.string(),
      validade: z.string(),
      cvv: z.string(),
    })
    .optional(),
})

// GET /api/pagamentos - Listar pagamentos do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Filtrar por usuário (exceto admin)
    if (session.user.role === 'CLIENTE' && session.user.clienteId) {
      where.clienteId = session.user.clienteId
    }

    if (status) {
      where.status = status
    }

    const pagamentos = await prisma.pagamento.findMany({
      where,
      include: {
        pedido: {
          select: {
            id: true,
            status: true,
            tipoServico: true,
            valorTotal: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      data: pagamentos,
    })
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/pagamentos - Criar pagamento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = criarPagamentoSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { pedidoId, metodo, cartao } = validation.data

    // Buscar pedido
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        cliente: { select: { id: true, userId: true } },
        pagamento: true,
      },
    })

    if (!pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se é o dono do pedido
    if (pedido.cliente.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar se já existe pagamento aprovado
    if (pedido.pagamento?.status === 'APROVADO') {
      return NextResponse.json(
        { success: false, error: 'Este pedido já foi pago' },
        { status: 400 }
      )
    }

    // Calcular valores
    const valor = pedido.valorTotal
    const taxaPlataforma = calcularTaxaPlataforma(valor)
    const valorMotoboy = calcularValorMotoboy(valor)

    // Processar pagamento
    if (metodo === 'PIX') {
      const resultadoPix = await gerarPagamentoPix({
        pedidoId,
        clienteId: pedido.clienteId,
        valor,
        metodo: 'PIX',
      })

      // Criar ou atualizar pagamento
      const pagamento = await prisma.pagamento.upsert({
        where: { pedidoId },
        create: {
          pedidoId,
          clienteId: pedido.clienteId,
          valor,
          taxaPlataforma,
          valorMotoboy,
          metodo: 'PIX',
          status: 'PENDENTE',
          gatewayId: resultadoPix.gatewayId,
          pixQrCode: resultadoPix.qrCode,
          pixCopiaCola: resultadoPix.copiaCola,
          pixExpiraEm: resultadoPix.expiraEm,
        },
        update: {
          metodo: 'PIX',
          status: 'PENDENTE',
          gatewayId: resultadoPix.gatewayId,
          pixQrCode: resultadoPix.qrCode,
          pixCopiaCola: resultadoPix.copiaCola,
          pixExpiraEm: resultadoPix.expiraEm,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          pagamento,
          pix: {
            qrCode: resultadoPix.qrCode,
            copiaCola: resultadoPix.copiaCola,
            expiraEm: resultadoPix.expiraEm,
          },
        },
        message: 'PIX gerado com sucesso',
      })
    }

    if (metodo === 'CARTAO_CREDITO' || metodo === 'CARTAO_DEBITO') {
      if (!cartao) {
        return NextResponse.json(
          { success: false, error: 'Dados do cartão são obrigatórios' },
          { status: 400 }
        )
      }

      const resultadoCartao = await processarPagamentoCartao({
        pedidoId,
        clienteId: pedido.clienteId,
        valor,
        metodo: metodo as MetodoPagamento,
        cartao,
      })

      if (!resultadoCartao.success) {
        return NextResponse.json(
          { success: false, error: resultadoCartao.mensagem },
          { status: 400 }
        )
      }

      const statusPagamento = resultadoCartao.aprovado ? 'APROVADO' : 'RECUSADO'

      // Criar ou atualizar pagamento
      const pagamento = await prisma.pagamento.upsert({
        where: { pedidoId },
        create: {
          pedidoId,
          clienteId: pedido.clienteId,
          valor,
          taxaPlataforma,
          valorMotoboy,
          metodo,
          status: statusPagamento,
          gatewayId: resultadoCartao.gatewayId,
          cartaoUltimos4: resultadoCartao.ultimos4,
          cartaoBandeira: resultadoCartao.bandeira,
          aprovadoEm: resultadoCartao.aprovado ? new Date() : null,
        },
        update: {
          metodo,
          status: statusPagamento,
          gatewayId: resultadoCartao.gatewayId,
          cartaoUltimos4: resultadoCartao.ultimos4,
          cartaoBandeira: resultadoCartao.bandeira,
          aprovadoEm: resultadoCartao.aprovado ? new Date() : null,
        },
      })

      if (!resultadoCartao.aprovado) {
        return NextResponse.json({
          success: false,
          error: resultadoCartao.mensagem,
          data: { pagamento },
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: { pagamento },
        message: 'Pagamento aprovado!',
      })
    }

    if (metodo === 'DINHEIRO') {
      // Pagamento em dinheiro - apenas registrar
      const pagamento = await prisma.pagamento.upsert({
        where: { pedidoId },
        create: {
          pedidoId,
          clienteId: pedido.clienteId,
          valor,
          taxaPlataforma,
          valorMotoboy,
          metodo: 'DINHEIRO',
          status: 'PENDENTE',
          gatewayId: `CASH_${Date.now()}`,
        },
        update: {
          metodo: 'DINHEIRO',
          status: 'PENDENTE',
        },
      })

      return NextResponse.json({
        success: true,
        data: { pagamento },
        message: 'Pagamento em dinheiro registrado',
      })
    }

    return NextResponse.json(
      { success: false, error: 'Método de pagamento inválido' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro ao criar pagamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
