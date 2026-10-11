import type { Prisma, StatusPedido } from '@prisma/client'
import type { OrgUser } from './auth-helpers'
import type { UpdatePedidoStatusInput } from './validations'
import { podeAlterarPedido } from './pedido-permissions'
import { comPedidoBloqueado, liberarCreditoEntrega } from './pedido-transaction'
import { OperacaoError } from './operacao-error'
import { clientePedidoSelect } from './pedido-select'
import { ELECTRONIC_PAYMENTS_AVAILABLE } from './payment-policy'

const transicoes: Record<StatusPedido, StatusPedido[]> = {
  SOLICITADO: ['ACEITO', 'CANCELADO'], ACEITO: ['EM_COLETA', 'CANCELADO'],
  EM_COLETA: ['EM_ENTREGA', 'CANCELADO'], EM_ENTREGA: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [], CANCELADO: [],
}

const ATIVOS: StatusPedido[] = ['ACEITO', 'EM_COLETA', 'EM_ENTREGA']

/**
 * Reserva o motoboy para um pedido (DISPONIVEL → EM_ENTREGA) de forma atômica.
 * A atualização condicional serializa também dois pedidos disputando o mesmo motoboy.
 * Chamar com o pedido bloqueado (comPedidoBloqueado).
 */
export async function reservarMotoboy(tx: Prisma.TransactionClient, organizationId: string, motoboyId: string) {
  const reserva = await tx.motoboy.updateMany({
    where: { id: motoboyId, organizationId, status: 'DISPONIVEL', aprovacao: 'APROVADO' }, data: { status: 'EM_ENTREGA' },
  })
  if (reserva.count !== 1) throw new OperacaoError('Motoboy não está disponível')
  const ativo = await tx.pedido.findFirst({ where: { motoboyId, status: { in: ATIVOS } } })
  if (ativo) throw new OperacaoError('Motoboy já possui uma entrega em andamento')
}

/** Encerra ofertas em aberto do pedido (aceite, atribuição manual ou cancelamento). */
export async function encerrarOfertas(tx: Prisma.TransactionClient, pedidoId: string, status: 'ACEITA' | 'CANCELADA' = 'CANCELADA') {
  await tx.dispatchOffer.updateMany({ where: { pedidoId, status: 'OFERTADA' }, data: { status, respondidaEm: new Date() } })
}

export async function alterarStatusPedido(id: string, user: OrgUser, data: UpdatePedidoStatusInput) {
  return comPedidoBloqueado(id, async tx => {
    const pedido = await tx.pedido.findUniqueOrThrow({ where: { id }, include: { pagamento: true } })
    // Pedido de outra central: responde como inexistente
    if (pedido.organizationId !== user.organizationId) throw new OperacaoError('Pedido não encontrado', 404)
    if (!podeAlterarPedido(user, pedido, data.status)) {
      throw new OperacaoError('Você não tem permissão para executar esta ação', 403)
    }
    if (!transicoes[pedido.status].includes(data.status)) {
      throw new OperacaoError(`Não é possível mudar status de ${pedido.status} para ${data.status}`)
    }
    const update: Prisma.PedidoUncheckedUpdateInput = { status: data.status }
    if (data.status === 'ACEITO') {
      // Atribuição manual pela gestão; o motoboy aceita pela oferta (src/lib/despacho.ts)
      const motoboyId = data.motoboyId
      if (!motoboyId) throw new OperacaoError('motoboyId é obrigatório para aceitar pedido', 400)
      await reservarMotoboy(tx, user.organizationId, motoboyId)
      await encerrarOfertas(tx, id)
      update.motoboyId = motoboyId
      update.aceitoEm = new Date()
      update.despachoManual = false
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
      await encerrarOfertas(tx, id)
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
        cliente: { select: clientePedidoSelect },
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
