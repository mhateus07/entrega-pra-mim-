import { parsePagination, paginationMeta, enumFilter } from '@/lib/pagination'
import { dividirPagamento } from '@/lib/money'
import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { comPedidoBloqueado, liberarCreditoEntrega } from '@/lib/pedido-transaction'
import { podeGerenciarPagamento } from '@/lib/pedido-permissions'
import { ELECTRONIC_PAYMENTS_AVAILABLE } from '@/lib/payment-policy'
import { OperacaoError } from '@/lib/operacao-error'
import {
  gerarPagamentoPix,
  processarPagamentoCartao,
  IS_PAYMENT_MOCK,
} from '@/lib/pagamentos'
import { requireAuth, applyRateLimit, serverError, badRequest, forbidden } from '@/lib/auth-helpers'

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
    const paging = parsePagination(searchParams)
    const status = enumFilter(searchParams.get('status'), ['PENDENTE', 'PROCESSANDO', 'APROVADO', 'RECUSADO', 'CANCELADO', 'REEMBOLSADO'] as const)

    const where: Prisma.PagamentoWhereInput = {}

    // Filtrar por usuário (exceto admin)
    if (auth.user.role === 'CLIENTE' && auth.user.clienteId) {
      where.clienteId = auth.user.clienteId
    } else if (auth.user.role !== 'ADMIN') {
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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: paging.take, skip: paging.skip,
    })

    const total = await prisma.pagamento.count({ where })
    return jsonResponse({
      success: true,
      pagination: paginationMeta(paging.page, paging.pageSize, total),
      data: pagamentos,
      // Aviso sobre sistema mock
      ...(IS_PAYMENT_MOCK && { _warning: 'Sistema de pagamento em modo de demonstração' }),
    })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao listar pagamentos:', error)
    return serverError('Erro ao listar pagamentos')
  }
}

// O lock do pedido impede substituir um pagamento aprovado por uma segunda requisição.
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await applyRateLimit(request, 'sensitive')
    if (!rateLimit.success) return rateLimit.response
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response
    const validation = criarPagamentoSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest('Dados de pagamento inválidos')
    const { pedidoId, metodo, cartao } = validation.data
    if (metodo !== 'DINHEIRO' && !ELECTRONIC_PAYMENTS_AVAILABLE) {
      return jsonResponse({ success: false, error: 'Pagamentos eletrônicos ainda não estão disponíveis. Escolha dinheiro.' }, { status: 503 })
    }

    const pagamento = await comPedidoBloqueado(pedidoId, async tx => {
      const pedido = await tx.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { pagamento: true } })
      if (!podeGerenciarPagamento(auth.user, pedido)) throw new OperacaoError('Acesso negado', 403)
      if (pedido.status === 'CANCELADO') throw new OperacaoError('Pedido cancelado não pode receber pagamento')
      const anterior = pedido.pagamento
      if (anterior?.status === 'APROVADO' || anterior?.status === 'PROCESSANDO') {
        throw new OperacaoError('Este pedido já foi pago ou está em processamento')
      }
      if (anterior?.status === 'REEMBOLSADO') throw new OperacaoError('Este pagamento já foi reembolsado')
      if (anterior?.status === 'PENDENTE') {
        if (anterior.metodo !== metodo) throw new OperacaoError('Cancele o pagamento pendente antes de trocar o método')
        if (metodo === 'DINHEIRO' || (metodo === 'PIX' && anterior.pixExpiraEm && anterior.pixExpiraEm > new Date())) return anterior
      }
      const valores = dividirPagamento(pedido.valorTotal)
      const valor = valores.valor.toNumber()
      const dados: Prisma.PagamentoUncheckedCreateInput = {
        pedidoId, clienteId: pedido.clienteId, ...valores, metodo, status: 'PENDENTE',
        gatewayId: null, pixQrCode: null, pixCopiaCola: null, pixExpiraEm: null,
        cartaoUltimos4: null, cartaoBandeira: null, aprovadoEm: null,
        canceladoEm: null, reembolsadoEm: null, gatewayResponse: null,
      }
      if (metodo === 'PIX') {
        const pix = await gerarPagamentoPix({ pedidoId, clienteId: pedido.clienteId, valor, metodo })
        Object.assign(dados, { gatewayId: pix.gatewayId, pixQrCode: pix.qrCode,
          pixCopiaCola: pix.copiaCola, pixExpiraEm: pix.expiraEm })
      } else if (metodo !== 'DINHEIRO') {
        if (!cartao) throw new OperacaoError('Dados do cartão são obrigatórios', 400)
        const resultado = await processarPagamentoCartao({ pedidoId, clienteId: pedido.clienteId, valor, metodo, cartao })
        if (!resultado.success) throw new OperacaoError(resultado.mensagem, 400)
        Object.assign(dados, { status: resultado.aprovado ? 'APROVADO' : 'RECUSADO',
          gatewayId: resultado.gatewayId, cartaoUltimos4: resultado.ultimos4,
          cartaoBandeira: resultado.bandeira, aprovadoEm: resultado.aprovado ? new Date() : null })
      }
      const updated = await tx.pagamento.upsert({ where: { pedidoId }, create: dados, update: dados })
      if (updated.status === 'APROVADO') await liberarCreditoEntrega(tx, pedidoId)
      return updated
    })
    if (pagamento.status === 'RECUSADO') return jsonResponse({ success: false, error: 'Pagamento recusado', data: { pagamento } }, { status: 400 })
    return jsonResponse({ success: true, data: { pagamento,
      ...(pagamento.metodo === 'PIX' ? { pix: { qrCode: pagamento.pixQrCode, copiaCola: pagamento.pixCopiaCola, expiraEm: pagamento.pixExpiraEm } } : {}),
    }, message: pagamento.status === 'APROVADO' ? 'Pagamento aprovado' : 'Pagamento registrado' })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao criar pagamento:', error)
    return serverError('Erro ao processar pagamento')
  }
}
