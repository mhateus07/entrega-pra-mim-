import { Prisma } from '@prisma/client'
import prisma from './prisma'
import { OperacaoError } from './operacao-error'

// Todas as mutações de pedido/pagamento usam o mesmo lock, inclusive a criação
// de pagamento. Assim duas requisições não creditam ou aceitam o mesmo pedido.
export async function comPedidoBloqueado<T>(
  pedidoId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const rows = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM pedidos WHERE id = ${pedidoId} FOR UPDATE
        `
        if (!rows.length) throw new OperacaoError('Pedido não encontrado', 404)
        return operation(tx)
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error
      if (attempt === 2) throw new OperacaoError('Operação concorrente. Tente novamente.')
    }
  }
  throw new OperacaoError('Não foi possível concluir a operação')
}

// Chamar somente com o pedido bloqueado na mesma transação.
export async function liberarCreditoEntrega(tx: Prisma.TransactionClient, pedidoId: string) {
  const pedido = await tx.pedido.findUniqueOrThrow({
    where: { id: pedidoId }, include: { pagamento: true },
  })
  const pagamento = pedido.pagamento
  if (pedido.status !== 'ENTREGUE' || !pedido.motoboyId || pagamento?.status !== 'APROVADO') return

  const creditos = await tx.transacaoMotoboy.findMany({
    where: { pedidoId, tipo: 'CREDITO', status: { in: ['PENDENTE', 'CONCLUIDO'] } },
  })
  // Não alterar silenciosamente saldos legados inconsistentes.
  if (creditos.length > 1) throw new OperacaoError('Créditos duplicados: este pedido precisa de conciliação pelo administrador')
  const credito = creditos[0]
  if (credito?.status === 'CONCLUIDO') return
  const valor = pagamento.valorMotoboy
  if (credito && (credito.motoboyId !== pedido.motoboyId || !credito.valor.equals(valor))) {
    throw new OperacaoError('Crédito divergente: este pedido precisa de conciliação pelo administrador')
  }

  if (credito) {
    // O fluxo antigo já somava o crédito pendente ao total recebido.
    const saldo = await tx.saldoMotoboy.updateMany({
      where: { motoboyId: pedido.motoboyId, saldoPendente: { gte: valor } },
      data: { saldoPendente: { decrement: valor }, saldoDisponivel: { increment: valor } },
    })
    if (saldo.count !== 1) throw new OperacaoError('Saldo pendente divergente: é necessária conciliação')
    await tx.transacaoMotoboy.update({ where: { id: credito.id }, data: { status: 'CONCLUIDO' } })
    return
  }

  await tx.transacaoMotoboy.create({
    data: { motoboyId: pedido.motoboyId, pedidoId, tipo: 'CREDITO', valor,
      descricao: `Entrega #${pedidoId.slice(0, 8)}`, status: 'CONCLUIDO' },
  })
  await tx.saldoMotoboy.upsert({
    where: { motoboyId: pedido.motoboyId },
    create: { motoboyId: pedido.motoboyId, saldoDisponivel: valor, totalRecebido: valor },
    update: { saldoDisponivel: { increment: valor }, totalRecebido: { increment: valor } },
  })
}
