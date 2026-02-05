import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMissingTransactions() {
  console.log('Buscando pedidos entregues sem transação...')

  // Buscar pedidos entregues
  const pedidosEntregues = await prisma.pedido.findMany({
    where: {
      status: 'ENTREGUE',
      motoboyId: { not: null }
    },
    include: {
      pagamento: true,
      motoboy: true
    }
  })

  console.log(`Encontrados ${pedidosEntregues.length} pedidos entregues`)

  for (const pedido of pedidosEntregues) {
    if (!pedido.motoboyId) continue

    // Verificar se já existe transação
    const transacaoExistente = await prisma.transacaoMotoboy.findFirst({
      where: { pedidoId: pedido.id }
    })

    if (transacaoExistente) {
      console.log(`Pedido ${pedido.id.slice(0, 8)} já tem transação`)
      continue
    }

    console.log(`Criando registros para pedido ${pedido.id.slice(0, 8)}...`)

    // Calcular valores (motoboy fica com 80%, plataforma 20%)
    const taxaPlataforma = pedido.valorTotal * 0.20
    const valorMotoboy = pedido.valorTotal - taxaPlataforma

    // Criar ou atualizar pagamento
    if (!pedido.pagamento) {
      await prisma.pagamento.create({
        data: {
          pedidoId: pedido.id,
          clienteId: pedido.clienteId,
          valor: pedido.valorTotal,
          valorMotoboy: valorMotoboy,
          taxaPlataforma: taxaPlataforma,
          metodo: 'PIX',
          status: 'APROVADO',
          aprovadoEm: pedido.entregueEm || new Date(),
        },
      })
      console.log(`  - Pagamento criado`)
    } else {
      await prisma.pagamento.update({
        where: { pedidoId: pedido.id },
        data: {
          status: 'APROVADO',
          aprovadoEm: pedido.entregueEm || new Date(),
          valorMotoboy: valorMotoboy,
          taxaPlataforma: taxaPlataforma,
        },
      })
      console.log(`  - Pagamento atualizado`)
    }

    // Criar transação para o motoboy
    await prisma.transacaoMotoboy.create({
      data: {
        motoboyId: pedido.motoboyId,
        pedidoId: pedido.id,
        tipo: 'CREDITO',
        valor: valorMotoboy,
        descricao: `Entrega #${pedido.id.slice(0, 8)}`,
        status: 'CONCLUIDO',
      },
    })
    console.log(`  - Transação criada: R$ ${valorMotoboy.toFixed(2)}`)

    // Atualizar ou criar saldo do motoboy
    const saldoExistente = await prisma.saldoMotoboy.findUnique({
      where: { motoboyId: pedido.motoboyId },
    })

    if (saldoExistente) {
      await prisma.saldoMotoboy.update({
        where: { motoboyId: pedido.motoboyId },
        data: {
          saldoDisponivel: { increment: valorMotoboy },
          totalRecebido: { increment: valorMotoboy },
        },
      })
    } else {
      await prisma.saldoMotoboy.create({
        data: {
          motoboyId: pedido.motoboyId,
          saldoDisponivel: valorMotoboy,
          saldoPendente: 0,
          totalRecebido: valorMotoboy,
        },
      })
    }
    console.log(`  - Saldo atualizado`)
  }

  console.log('\nConcluído!')
}

fixMissingTransactions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
