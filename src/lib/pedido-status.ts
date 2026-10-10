import type { Prisma, StatusPedido } from '@prisma/client'
import type { AuthenticatedUser } from './auth-helpers'
import type { UpdatePedidoStatusInput } from './validations'
import { podeAlterarPedido } from './pedido-permissions'
import { comPedidoBloqueado, liberarCreditoEntrega } from './pedido-transaction'
import { OperacaoError } from './operacao-error'
import { ELECTRONIC_PAYMENTS_AVAILABLE } from './payment-policy'

const transicoes: Record<StatusPedido, StatusPedido[]> = {
  SOLICITADO: ['ACEITO', 'CANCELADO'], ACEITO: ['EM_COLETA', 'CANCELADO'],
  EM_COLETA: ['EM_ENTREGA', 'CANCELADO'], EM_ENTREGA: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [], CANCELADO: [],
}

export async function alterarStatusPedido(id: string, user: AuthenticatedUser, data: UpdatePedidoStatusInput) {
  return comPedidoBloqueado(id, async tx => {
    const pedido = await tx.pedido.findUniqueOrThrow({ where: { id }, include: { pagamento: true } })
    if (!podeAlterarPedido(user, pedido, data.status, data.motoboyId)) {
      throw new OperacaoError('Você não tem permissão para executar esta ação', 403)
    }
    if (!transicoes[pedido.status].includes(data.status)) {
      throw new OperacaoError(`Não é possível mudar status de ${pedido.status} para ${data.status}`)
    }
    const update: Prisma.PedidoUncheckedUpdateInput = { status: data.status }
    if (data.status === 'ACEITO') {
      const motoboyId = user.role === 'MOTOBOY' ? user.motoboyId : data.motoboyId
      if (!motoboyId) throw new OperacaoError('motoboyId é obrigatório para aceitar pedido', 400)
      // A reserva condicional serializa também dois pedidos disputando um motoboy.
      const reserva = await tx.motoboy.updateMany({
        where: { id: motoboyId, status: 'DISPONIVEL', aprovacao: 'APROVADO' }, data: { status: 'EM_ENTREGA' },
      })
      if (reserva.count !== 1) throw new OperacaoError('Motoboy não está disponível')
      const ativo = await tx.pedido.findFirst({
        where: { motoboyId, status: { in: ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'] } },
      })
      if (ativo) throw new OperacaoError('Motoboy já possui uma entrega em andamento')
      update.motoboyId = motoboyId
      update.aceitoEm = new Date()
    }
    if (data.status === 'EM_ENTREGA') update.coletadoEm = new Date()
    if (data.status === 'ENTREGUE') {
      if (!pedido.fotoComprovante) throw new OperacaoError('Envie o comprovante antes de concluir a entrega', 400)
      update.entregueEm = new Date()
      if (data.assinaturaRecebedor) update.assinaturaRecebedor = data.assinaturaRecebedor
      // O comprovante é registrado exclusivamente pela rota de upload autorizada.
    }
    if (data.status === 'CANCELADO') {
      if (pedido.pagamento && ['APROVADO', 'PROCESSANDO'].includes(pedido.pagamento.status)) {
        throw new OperacaoError('O pagamento precisa ser conciliado ou reembolsado antes do cancelamento')
      }
      if (pedido.pagamento?.status === 'PENDENTE' && pedido.pagamento.metodo !== 'DINHEIRO' && !ELECTRONIC_PAYMENTS_AVAILABLE) {
        throw new OperacaoError('Pagamento eletrônico requer conciliação com o gateway', 503)
      }
      update.canceladoEm = new Date()
      update.motivoCancelamento = data.motivoCancelamento || 'Cancelado pelo usuário'
      await tx.pagamento.updateMany({
        where: { pedidoId: id, status: 'PENDENTE' },
        data: { status: 'CANCELADO', canceladoEm: new Date() },
      })
    }
    const updated = await tx.pedido.update({
      where: { id }, data: update,
      include: {
        cliente: { include: { user: { select: { nome: true, telefone: true } } } },
        motoboy: { select: { id: true, avaliacaoMedia: true, user: { select: { nome: true, telefone: true } } } },
        enderecoOrigem: true, enderecoDestino: true,
      },
    })
    if ((data.status === 'ENTREGUE' || data.status === 'CANCELADO') && pedido.motoboyId) {
      await tx.motoboy.update({
        where: { id: pedido.motoboyId },
        data: { status: 'DISPONIVEL', ultimaAtividade: new Date(),
          ...(data.status === 'ENTREGUE' ? { totalEntregas: { increment: 1 } } : {}) },
      })
    }
    if (data.status === 'ENTREGUE') await liberarCreditoEntrega(tx, id)
    return updated
  })
}
