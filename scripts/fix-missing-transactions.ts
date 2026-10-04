import prisma from '../src/lib/prisma'
import { comPedidoBloqueado, liberarCreditoEntrega } from '../src/lib/pedido-transaction'

// Simulação por padrão. Nunca cria ou aprova pagamentos e nunca recalcula a
// comissão histórica. --apply libera somente créditos de pagamentos aprovados.
async function fixMissingTransactions() {
  const apply = process.argv.includes('--apply')
  const pedidos = await prisma.pedido.findMany({
    where: { status: 'ENTREGUE', motoboyId: { not: null }, pagamento: { status: 'APROVADO' } },
    select: { id: true },
  })
  console.log(`${pedidos.length} pedidos elegíveis. Modo: ${apply ? 'aplicar' : 'simulação'}`)
  for (const pedido of pedidos) {
    if (!apply) {
      console.log(`Revisar crédito do pedido ${pedido.id}`)
      continue
    }
    try {
      await comPedidoBloqueado(pedido.id, tx => liberarCreditoEntrega(tx, pedido.id))
    } catch (error) {
      console.error(`Pedido ${pedido.id}:`, error)
      process.exitCode = 1
    }
  }
}
fixMissingTransactions().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
