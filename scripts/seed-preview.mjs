import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const target = new URL(process.env.DATABASE_URL || 'mysql://invalid')
if (target.hostname !== '127.0.0.1' || target.port !== '33379' || target.pathname !== '/entrega_test') {
  throw new Error('A prévia só pode ser preenchida no banco local descartável da porta 33379')
}
const db = new PrismaClient()
try {
  const senha = await bcrypt.hash('Demo@123', 10)
  for (const [role, email, nome] of [
    ['ADMIN', 'admin@demo.local', 'Administrador Demo'],
    ['CLIENTE', 'cliente@demo.local', 'Cliente Demonstração'],
    ['MOTOBOY', 'motoboy@demo.local', 'Entregador Demonstração'],
  ]) {
    await db.user.upsert({ where: { email }, update: {}, create: { role, email, nome, senha, telefone: '32999990000' } })
  }
  const clientUser = await db.user.findUniqueOrThrow({ where: { email: 'cliente@demo.local' } })
  const driverUser = await db.user.findUniqueOrThrow({ where: { email: 'motoboy@demo.local' } })
  const cliente = await db.cliente.upsert({ where: { userId: clientUser.id }, update: {}, create: { userId: clientUser.id } })
  const motoboy = await db.motoboy.upsert({ where: { userId: driverUser.id }, update: {}, create: {
    userId: driverUser.id, cnh: '00000000000', veiculoTipo: 'Moto', veiculoMarca: 'Honda', veiculoModelo: 'CG 160',
    veiculoPlaca: 'DEM1A23', status: 'DISPONIVEL', aprovacao: 'APROVADO', totalEntregas: 20, avaliacaoMedia: 5,
  } })
  const addresses = []
  for (const [i, logradouro, bairro, lat, lng] of [[1, 'Rua Halfeld', 'Centro', -21.761, -43.349], [2, 'Avenida Rio Branco', 'São Mateus', -21.775, -43.351]]) {
    addresses.push(await db.endereco.upsert({ where: { id: `cpreviewaddress000000000${i}` }, update: {}, create: {
      id: `cpreviewaddress000000000${i}`, clienteId: cliente.id, apelido: i === 1 ? 'Coleta demonstração' : 'Entrega demonstração',
      cep: '36000000', logradouro, numero: '100', bairro, cidade: 'Juiz de Fora', estado: 'MG', latitude: lat, longitude: lng,
    } }))
  }
  let total = new Prisma.Decimal(0)
  for (let i = 0; i < 26; i++) {
    const entregue = i < 20
    const valor = new Prisma.Decimal(12 + (i % 7) * 2)
    const taxa = valor.mul('0.15').toDecimalPlaces(2)
    const ganho = valor.minus(taxa)
    const createdAt = new Date(Date.now() - (entregue ? i % 7 : 0) * 86400000 - i * 60000)
    const id = `cprevieworder${String(i).padStart(12, '0')}`
    await db.pedido.upsert({ where: { id }, update: {}, create: {
      id, clienteId: cliente.id, motoboyId: entregue ? motoboy.id : null, enderecoOrigemId: addresses[0].id, enderecoDestinoId: addresses[1].id,
      tipoServico: 'EXPRESSA', status: entregue ? 'ENTREGUE' : 'SOLICITADO', descricaoItem: 'Pedido fictício para visualizar a plataforma',
      distanciaKm: 2 + (i % 5), duracaoEstimada: 15 + (i % 5) * 3, valorBase: 10, multiplicador: 1, valorTotal: valor,
      createdAt, entregueEm: entregue ? createdAt : null,
      pagamento: { create: { clienteId: cliente.id, valor, taxaPlataforma: taxa, valorMotoboy: ganho, metodo: 'DINHEIRO',
        status: entregue ? 'APROVADO' : 'PENDENTE', aprovadoEm: entregue ? createdAt : null } },
      ...(entregue ? { transacoes: { create: { motoboyId: motoboy.id, tipo: 'CREDITO', status: 'CONCLUIDO', valor: ganho,
        descricao: `Entrega demonstrativa ${i + 1}`, createdAt } } } : {}),
    } })
    if (entregue) total = total.plus(ganho)
  }
  await db.saldoMotoboy.upsert({ where: { motoboyId: motoboy.id }, update: {}, create: {
    motoboyId: motoboy.id, saldoDisponivel: total, totalRecebido: total,
  } })
  console.log('Prévia preparada: 3 perfis, 26 pedidos e extrato de demonstração.')
} finally { await db.$disconnect() }
