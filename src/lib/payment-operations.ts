import type { StatusPagamento } from '@prisma/client'
import type { AuthenticatedUser } from './auth-helpers'
import { comPedidoBloqueado, liberarCreditoEntrega } from './pedido-transaction'
import { podeConfirmarDinheiro, podeGerenciarPagamento } from './pedido-permissions'
import { OperacaoError } from './operacao-error'
import { ELECTRONIC_PAYMENTS_AVAILABLE } from './payment-policy'
import { verificarStatusPix, cancelarPagamento } from './pagamentos'

export async function executarAcaoPagamento(
  pedidoId: string, pagamentoId: string, user: AuthenticatedUser,
  acao: 'verificar' | 'confirmar_dinheiro' | 'cancelar',
) {
  return comPedidoBloqueado(pedidoId, async tx => {
    const pagamento = await tx.pagamento.findUnique({
      where: { id: pagamentoId }, include: { pedido: true },
    })
    if (!pagamento || pagamento.pedidoId !== pedidoId) throw new OperacaoError('Pagamento não encontrado', 404)
    const autorizado = acao === 'confirmar_dinheiro'
      ? podeConfirmarDinheiro(user, pagamento.pedido.motoboyId)
      : podeGerenciarPagamento(user, pagamento)
    if (!autorizado) throw new OperacaoError('Acesso negado', 403)
    if (acao === 'cancelar') {
      if (pagamento.status === 'CANCELADO') return pagamento
      if (pagamento.status !== 'PENDENTE') throw new OperacaoError('Pagamento não pode ser cancelado')
      if (pagamento.metodo !== 'DINHEIRO' && pagamento.gatewayId) {
        if (!ELECTRONIC_PAYMENTS_AVAILABLE) throw new OperacaoError('Pagamento eletrônico requer conciliação com o gateway', 503)
        const cancelado = await cancelarPagamento(pagamento.gatewayId)
        if (!cancelado) throw new OperacaoError('Gateway não confirmou o cancelamento')
      }
      return tx.pagamento.update({ where: { id: pagamentoId }, data: { status: 'CANCELADO', canceladoEm: new Date() } })
    }
    if (pagamento.pedido.status === 'CANCELADO') throw new OperacaoError('Pedido cancelado não pode receber pagamento')
    if (acao === 'confirmar_dinheiro' && pagamento.metodo !== 'DINHEIRO') throw new OperacaoError('Método de pagamento inválido', 400)
    if (acao === 'verificar' && pagamento.metodo !== 'PIX') throw new OperacaoError('Método de pagamento inválido', 400)
    // Repetição de uma confirmação é uma leitura: nunca gera novo crédito.
    if (pagamento.status === 'APROVADO') return pagamento
    if (pagamento.status !== 'PENDENTE') throw new OperacaoError('Pagamento não está pendente')

    let status: StatusPagamento
    if (acao === 'confirmar_dinheiro') {
      if (!['EM_ENTREGA', 'ENTREGUE'].includes(pagamento.pedido.status)) {
        throw new OperacaoError('Confirme o dinheiro no momento da entrega')
      }
      status = 'APROVADO'
    } else {
      if (!ELECTRONIC_PAYMENTS_AVAILABLE) throw new OperacaoError('Pagamentos eletrônicos ainda não estão disponíveis', 503)
      status = pagamento.pixExpiraEm && pagamento.pixExpiraEm <= new Date()
        ? 'CANCELADO' : await verificarStatusPix(pagamento.gatewayId || '')
    }
    const updated = await tx.pagamento.update({
      where: { id: pagamentoId },
      data: { status, aprovadoEm: status === 'APROVADO' ? new Date() : null,
        canceladoEm: status === 'CANCELADO' ? new Date() : null },
    })
    if (status === 'APROVADO') await liberarCreditoEntrega(tx, pedidoId)
    return updated
  })
}
