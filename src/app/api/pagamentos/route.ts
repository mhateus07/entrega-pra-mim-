import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import {
  gerarPagamentoPix,
  processarPagamentoCartao,
  calcularTaxaPlataforma,
  calcularValorMotoboy,
  MetodoPagamento,
  IS_PAYMENT_MOCK,
} from '@/lib/pagamentos'
import { requireAuth, applyRateLimit, serverError, badRequest, notFound, forbidden } from '@/lib/auth-helpers'

// =============================================================================
// Validação de dados de pagamento
// =============================================================================
// Validação mais rigorosa para dados de cartão
// NOTA: Em produção com gateway real, use tokenização e nunca processe CVV no servidor

const cartaoSchema = z.object({
  // Número do cartão: 13-19 dígitos (aceita espaços)
  numero: z.string()
    .transform(val => val.replace(/\s/g, ''))
    .refine(val => /^\d{13,19}$/.test(val), {
      message: 'Número do cartão deve ter entre 13 e 19 dígitos',
    }),
  // Nome do titular: 3-50 caracteres, apenas letras e espaços
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .refine(val => /^[a-zA-ZÀ-ÿ\s]+$/.test(val), {
      message: 'Nome deve conter apenas letras',
    }),
  // Validade: MM/YY
  validade: z.string()
    .regex(/^\d{2}\/\d{2}$/, 'Validade deve estar no formato MM/YY'),
  // CVV: 3-4 dígitos (AMEX usa 4)
  cvv: z.string()
    .regex(/^\d{3,4}$/, 'CVV deve ter 3 ou 4 dígitos'),
})

const criarPagamentoSchema = z.object({
  pedidoId: z.string().min(1, 'pedidoId é obrigatório'),
  metodo: z.enum(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO']),
  cartao: cartaoSchema.optional(),
})

// GET /api/pagamentos - Listar pagamentos do usuário
export async function GET(request: NextRequest) {
  try {
    // Requer autenticação
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    // Filtrar por usuário (exceto admin)
    if (auth.user.role === 'CLIENTE' && auth.user.clienteId) {
      where.clienteId = auth.user.clienteId
    } else if (auth.user.role === 'MOTOBOY') {
      // Motoboy não deveria ver pagamentos diretamente
      return forbidden('Acesso não permitido')
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
      // Aviso sobre sistema mock
      ...(IS_PAYMENT_MOCK && { _warning: 'Sistema de pagamento em modo de demonstração' }),
    })
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error)
    return serverError('Erro ao listar pagamentos')
  }
}

// POST /api/pagamentos - Criar pagamento (rate limited)
export async function POST(request: NextRequest) {
  try {
    // Rate limit para pagamentos (20 req/min)
    const rateLimit = applyRateLimit(request, 'sensitive')
    if (!rateLimit.success) return rateLimit.response

    // Requer autenticação
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const body = await request.json()
    const validation = criarPagamentoSchema.safeParse(body)

    if (!validation.success) {
      // Não expor detalhes de validação de cartão por segurança
      return badRequest('Dados de pagamento inválidos')
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
      return notFound('Pedido não encontrado')
    }

    // Verificar se é o dono do pedido
    if (pedido.cliente.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return forbidden('Acesso negado')
    }

    // Verificar se já existe pagamento aprovado
    if (pedido.pagamento?.status === 'APROVADO') {
      return badRequest('Este pedido já foi pago')
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

    return badRequest('Método de pagamento inválido')
  } catch (error) {
    console.error('Erro ao criar pagamento:', error)
    return serverError('Erro ao processar pagamento')
  }
}
