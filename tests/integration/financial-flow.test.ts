import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { AuthenticatedUser } from '@/lib/auth-helpers'
import { randomUUID } from 'node:crypto'

// Os testes criam somente fixtures próprias, nunca limpam tabelas existentes.
const testUrl = process.env.TEST_DATABASE_URL
if (testUrl && !new URL(testUrl).pathname.endsWith('/entrega_test')) {
  throw new Error('TEST_DATABASE_URL deve apontar para o banco descartável entrega_test')
}
const suite = testUrl ? describe : describe.skip

suite('MySQL: transações, autorização e concorrência', () => {
  let db: PrismaClient
  let alterar: typeof import('@/lib/pedido-status').alterarStatusPedido
  let pagar: typeof import('@/lib/payment-operations').executarAcaoPagamento
  let bloquear: typeof import('@/lib/pedido-transaction').comPedidoBloqueado
  let liberar: typeof import('@/lib/pedido-transaction').liberarCreditoEntrega
  let cliente: AuthenticatedUser
  let driver: AuthenticatedUser
  let otherDriver: AuthenticatedUser
  let origemId: string
  let destinoId: string
  const pedidos: string[] = []
  const users: string[] = []

  beforeAll(async () => {
    process.env.DATABASE_URL = testUrl!
    const prismaModule = await import('@/lib/prisma')
    db = prismaModule.default
    alterar = (await import('@/lib/pedido-status')).alterarStatusPedido
    pagar = (await import('@/lib/payment-operations')).executarAcaoPagamento
    const transactions = await import('@/lib/pedido-transaction')
    bloquear = transactions.comPedidoBloqueado
    liberar = transactions.liberarCreditoEntrega
    const user = await db.user.create({ data: {
      nome: 'Teste cliente', email: `${randomUUID()}@test.local`, senha: 'fixture', role: 'CLIENTE', cliente: { create: {} },
    }, include: { cliente: true } })
    users.push(user.id)
    cliente = { id: user.id, email: user.email, role: 'CLIENTE', clienteId: user.cliente!.id, motoboyId: null }
    const drivers = []
    for (let i = 0; i < 2; i++) {
      const user = await db.user.create({ data: {
        nome: 'Teste motoboy', email: `${randomUUID()}@test.local`, senha: 'fixture', role: 'MOTOBOY',
        motoboy: { create: { cnh: randomUUID(), veiculoTipo: 'Moto', veiculoMarca: 'Teste',
          veiculoModelo: 'Teste', veiculoPlaca: randomUUID(), status: 'DISPONIVEL' } },
      }, include: { motoboy: true } })
      users.push(user.id)
      drivers.push({ id: user.id, email: user.email, role: 'MOTOBOY' as const, clienteId: null, motoboyId: user.motoboy!.id })
    }
    ;[driver, otherDriver] = drivers
    const enderecos = []
    for (let i = 0; i < 2; i++) {
      enderecos.push(await db.endereco.create({ data: { clienteId: cliente.clienteId!, cep: '36000000',
        logradouro: 'Rua teste', numero: '1', bairro: 'Centro', cidade: 'Juiz de Fora', estado: 'MG' } }))
    }
    origemId = enderecos[0].id
    destinoId = enderecos[1].id
  })

  async function pedido(status: 'SOLICITADO' | 'EM_ENTREGA' | 'ENTREGUE' = 'ENTREGUE', aprovado = false) {
    const record = await db.pedido.create({ data: {
      clienteId: cliente.clienteId!, motoboyId: status === 'SOLICITADO' ? null : driver.motoboyId,
      enderecoOrigemId: origemId, enderecoDestinoId: destinoId, status, tipoServico: 'EXPRESSA',
      distanciaKm: 2, duracaoEstimada: 10, valorBase: 100, multiplicador: 1, valorTotal: 100,
      fotoComprovante: '/uploads/comprovantes/fixture.jpg',
      pagamento: { create: { clienteId: cliente.clienteId!, valor: 100, taxaPlataforma: 15,
        valorMotoboy: 85, metodo: 'DINHEIRO', status: aprovado ? 'APROVADO' : 'PENDENTE' } },
    }, include: { pagamento: true } })
    pedidos.push(record.id)
    return record
  }
  async function saldo() {
    return (await db.saldoMotoboy.findUnique({ where: { motoboyId: driver.motoboyId! } }))?.saldoDisponivel.toNumber() ?? 0
  }

  it('impede um cliente de concluir a entrega e um terceiro de confirmar ou cancelar pagamento', async () => {
    const p = await pedido('EM_ENTREGA')
    await expect(alterar(p.id, cliente, { status: 'ENTREGUE' })).rejects.toMatchObject({ status: 403 })
    await expect(pagar(p.id, p.pagamento!.id, otherDriver, 'confirmar_dinheiro')).rejects.toMatchObject({ status: 403 })
    await expect(pagar(p.id, p.pagamento!.id, { ...cliente, clienteId: 'outro' }, 'cancelar')).rejects.toMatchObject({ status: 403 })
    expect(await db.pagamento.findUnique({ where: { id: p.pagamento!.id } })).toMatchObject({ status: 'PENDENTE' })
    await db.pedido.update({ where: { id: p.id }, data: { status: 'CANCELADO' } })
  })

  it('não aprova nem credita pagamento pendente ao concluir uma entrega', async () => {
    const p = await pedido('EM_ENTREGA')
    const antes = await saldo()
    await alterar(p.id, driver, { status: 'ENTREGUE' })
    expect(await db.pagamento.findUnique({ where: { id: p.pagamento!.id } })).toMatchObject({ status: 'PENDENTE' })
    expect(await saldo()).toBe(antes)
    expect(await db.transacaoMotoboy.count({ where: { pedidoId: p.id } })).toBe(0)
  })

  it('confirmações concorrentes de dinheiro geram exatamente um crédito', async () => {
    const p = await pedido()
    const antes = await saldo()
    const results = await Promise.all(Array.from({ length: 4 }, () => pagar(p.id, p.pagamento!.id, driver, 'confirmar_dinheiro')))
    expect(results.every(p => p.status === 'APROVADO')).toBe(true)
    expect(await saldo()).toBe(antes + 85)
    expect(await db.transacaoMotoboy.count({ where: { pedidoId: p.id } })).toBe(1)
  })

  it('entrega e confirmação simultâneas liberam exatamente 85%, sem duplicação', async () => {
    const p = await pedido('EM_ENTREGA')
    const antes = await saldo()
    await Promise.all([alterar(p.id, driver, { status: 'ENTREGUE' }), pagar(p.id, p.pagamento!.id, driver, 'confirmar_dinheiro')])
    expect(await saldo()).toBe(antes + 85)
    expect(await db.transacaoMotoboy.count({ where: { pedidoId: p.id } })).toBe(1)
    const payment = await db.pagamento.findUniqueOrThrow({ where: { id: p.pagamento!.id } })
    expect(payment.taxaPlataforma.toFixed(2)).toBe('15.00')
    expect(payment.valorMotoboy.toFixed(2)).toBe('85.00')
  })

  it('confirmação antes da entrega aguarda conclusão para liberar saldo', async () => {
    const p = await pedido('EM_ENTREGA')
    const antes = await saldo()
    await pagar(p.id, p.pagamento!.id, driver, 'confirmar_dinheiro')
    expect(await saldo()).toBe(antes)
    await alterar(p.id, driver, { status: 'ENTREGUE' })
    expect(await saldo()).toBe(antes + 85)
    expect(await db.transacaoMotoboy.count({ where: { pedidoId: p.id } })).toBe(1)
  })

  it('concluir entrega sem pagamento não inventa um PIX aprovado', async () => {
    const p = await pedido('EM_ENTREGA')
    await db.pagamento.delete({ where: { id: p.pagamento!.id } })
    const antes = await saldo()
    await alterar(p.id, driver, { status: 'ENTREGUE' })
    expect(await db.pagamento.findUnique({ where: { pedidoId: p.id } })).toBeNull()
    expect(await saldo()).toBe(antes)
  })

  it('libera crédito legado pendente sem somar novamente ao total recebido', async () => {
    const p = await pedido('EM_ENTREGA', true)
    await db.transacaoMotoboy.create({ data: { pedidoId: p.id, motoboyId: driver.motoboyId!,
      tipo: 'CREDITO', status: 'PENDENTE', valor: 85, descricao: 'Crédito legado de teste' } })
    await db.saldoMotoboy.upsert({ where: { motoboyId: driver.motoboyId! },
      create: { motoboyId: driver.motoboyId!, saldoPendente: 85, totalRecebido: 85 },
      update: { saldoPendente: { increment: 85 }, totalRecebido: { increment: 85 } } })
    const antes = await db.saldoMotoboy.findUniqueOrThrow({ where: { motoboyId: driver.motoboyId! } })
    await alterar(p.id, driver, { status: 'ENTREGUE' })
    const depois = await db.saldoMotoboy.findUniqueOrThrow({ where: { motoboyId: driver.motoboyId! } })
    expect(depois.saldoDisponivel.equals(antes.saldoDisponivel.plus(85))).toBe(true)
    expect(depois.saldoPendente.equals(antes.saldoPendente.minus(85))).toBe(true)
    expect(depois.totalRecebido.equals(antes.totalRecebido)).toBe(true)
    expect(await db.transacaoMotoboy.count({ where: { pedidoId: p.id } })).toBe(1)
  })

  it('erro após crédito faz rollback de saldo e transação', async () => {
    const p = await pedido('ENTREGUE', true)
    const antes = await saldo()
    await expect(bloquear(p.id, async tx => {
      await liberar(tx, p.id)
      throw new Error('Falha simulada após crédito')
    })).rejects.toThrow('Falha simulada')
    expect(await saldo()).toBe(antes)
    expect(await db.transacaoMotoboy.count({ where: { pedidoId: p.id } })).toBe(0)
  })

  it('não permite concluir sem foto e não aceita URL enviada no PATCH como comprovante', async () => {
    const p = await pedido('EM_ENTREGA')
    await db.pedido.update({ where: { id: p.id }, data: { fotoComprovante: null } })
    await expect(alterar(p.id, driver, { status: 'ENTREGUE', fotoComprovante: 'https://falso.test/foto' })).rejects.toMatchObject({ status: 400 })
    await db.pedido.update({ where: { id: p.id }, data: { status: 'CANCELADO' } })
  })

  it('dois motoboys disputando um pedido resultam em apenas um aceite', async () => {
    const p = await pedido('SOLICITADO')
    await db.motoboy.updateMany({ where: { id: { in: [driver.motoboyId!, otherDriver.motoboyId!] } }, data: { status: 'DISPONIVEL' } })
    const results = await Promise.allSettled([driver, otherDriver].map(user => alterar(p.id, user, { status: 'ACEITO', motoboyId: user.motoboyId! })))
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const aceito = await db.pedido.findUniqueOrThrow({ where: { id: p.id } })
    const winner = aceito.motoboyId === driver.motoboyId ? driver : otherDriver
    const loser = winner === driver ? otherDriver : driver
    expect(await db.motoboy.findUnique({ where: { id: loser.motoboyId! } })).toMatchObject({ status: 'DISPONIVEL' })
    await alterar(p.id, winner, { status: 'CANCELADO' })
  })

  it('dois pedidos disputando o mesmo motoboy resultam em apenas uma atribuição', async () => {
    const a = await pedido('SOLICITADO')
    const b = await pedido('SOLICITADO')
    const results = await Promise.allSettled([a, b].map(p => alterar(p.id, driver, { status: 'ACEITO', motoboyId: driver.motoboyId! })))
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    for (const p of [a, b]) await alterar(p.id, cliente, { status: 'CANCELADO' })
  })

  it('não cancela entrega com pagamento aprovado sem conciliação', async () => {
    const p = await pedido('EM_ENTREGA', true)
    await expect(alterar(p.id, cliente, { status: 'CANCELADO' })).rejects.toMatchObject({ status: 409 })
    expect(await db.pedido.findUnique({ where: { id: p.id } })).toMatchObject({ status: 'EM_ENTREGA' })
  })

  afterAll(async () => {
    if (!db) return
    await db.transacaoMotoboy.deleteMany({ where: { pedidoId: { in: pedidos } } })
    await db.pagamento.deleteMany({ where: { pedidoId: { in: pedidos } } })
    await db.pedido.deleteMany({ where: { id: { in: pedidos } } })
    if (cliente) await db.endereco.deleteMany({ where: { clienteId: cliente.clienteId! } })
    await db.user.deleteMany({ where: { id: { in: users } } })
    await db.$disconnect()
  })
})
