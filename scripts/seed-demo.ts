import { Prisma, PrismaClient, StatusPedido, TipoServico, MetodoPagamento, StatusMotoboy, DiaSemana } from '@prisma/client'
import type { Cliente, Endereco, Motoboy } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { dividirPagamento, money } from '../src/lib/money'
import { MULTIPLICADORES, PRECO_POR_KM, estimarTempo } from '../src/lib/pricing'

// Popula uma instância de DEMONSTRAÇÃO com dados fictícios (Juiz de Fora/MG).
// APAGA todos os dados do banco antes de preencher; por isso só roda com
// DEMO_MODE=1, que existe apenas no .env da instância demo.
// Uso: DEMO_PASSWORD=... npx tsx scripts/seed-demo.ts

if (process.env.DEMO_MODE !== '1') {
  throw new Error('seed-demo só roda em instâncias com DEMO_MODE=1 (ele apaga o banco)')
}
const senhaDemo = process.env.DEMO_PASSWORD || ''
if (senhaDemo.length < 8) throw new Error('Defina DEMO_PASSWORD com pelo menos 8 caracteres')

const db = new PrismaClient()

// PRNG determinístico: a demo fica igual a cada reset
let seed = 20261004
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)]
const between = (min: number, max: number) => min + rand() * (max - min)
const int = (min: number, max: number) => Math.floor(between(min, max + 1))
const minutos = (data: Date, m: number) => new Date(data.getTime() + m * 60000)

const DOMINIO = 'demo.entregapramim.com'

type ClienteSeed = Cliente & { enderecos: Endereco[] }
type MotoboySeed = Motoboy & { entregas: number; notas: number[]; ganhos: Prisma.Decimal }

const BAIRROS = [
  ['Centro', 'Rua Halfeld', -21.7612, -43.3496], ['Centro', 'Avenida Barão do Rio Branco', -21.7648, -43.3470],
  ['São Mateus', 'Rua São Mateus', -21.7745, -43.3528], ['Cascatinha', 'Avenida Itamar Franco', -21.7800, -43.3610],
  ['Bom Pastor', 'Rua Padre Café', -21.7708, -43.3605], ['Granbery', 'Rua Batista de Oliveira', -21.7670, -43.3455],
  ['Santa Helena', 'Rua Oswaldo Aranha', -21.7542, -43.3633], ['Alto dos Passos', 'Rua Dom Viçoso', -21.7731, -43.3438],
  ['Benfica', 'Avenida Juscelino Kubitschek', -21.6926, -43.4363], ['São Pedro', 'Rua José Lourenço Kelmer', -21.7783, -43.3786],
  ['Mariano Procópio', 'Rua Mariano Procópio', -21.7489, -43.3611], ['Manoel Honório', 'Avenida Rui Barbosa', -21.7483, -43.3375],
  ['Teixeiras', 'Avenida Deusdedith Salgado', -21.7930, -43.3510], ['Cidade Universitária', 'Rua José Kelmer', -21.7770, -43.3720],
] as const

const CLIENTES = [
  { nome: 'Cliente Demonstração', email: `cliente@${DOMINIO}`, tipo: 'PF' },
  { nome: 'Farmácia Vida Saudável', email: `farmacia@${DOMINIO}`, tipo: 'PJ', razao: 'Vida Saudável Drogaria LTDA' },
  { nome: 'Padaria Pão Dourado', email: `padaria@${DOMINIO}`, tipo: 'PJ', razao: 'Pão Dourado Panificadora LTDA' },
  { nome: 'Silva & Rocha Advocacia', email: `advocacia@${DOMINIO}`, tipo: 'PJ', razao: 'Silva & Rocha Sociedade de Advogados' },
  { nome: 'Bella Moda Boutique', email: `bellamoda@${DOMINIO}`, tipo: 'PJ', razao: 'Bella Moda Comércio de Roupas LTDA' },
  { nome: 'Pet Shop Amigo Fiel', email: `petshop@${DOMINIO}`, tipo: 'PJ', razao: 'Amigo Fiel Pet LTDA' },
  { nome: 'Mariana Costa', email: `mariana@${DOMINIO}`, tipo: 'PF' },
  { nome: 'Rafael Almeida', email: `rafael@${DOMINIO}`, tipo: 'PF' },
  { nome: 'Juliana Ferreira', email: `juliana@${DOMINIO}`, tipo: 'PF' },
  { nome: 'Restaurante Sabor Mineiro', email: `sabormineiro@${DOMINIO}`, tipo: 'PJ', razao: 'Sabor Mineiro Alimentação LTDA' },
] as const

const MOTOBOYS = [
  { nome: 'Motoboy Demonstração', email: `motoboy@${DOMINIO}`, marca: 'Honda', modelo: 'CG 160 Fan', status: 'EM_ENTREGA' },
  { nome: 'Carlos Henrique Souza', email: `carlos@${DOMINIO}`, marca: 'Yamaha', modelo: 'Factor 150', status: 'DISPONIVEL' },
  { nome: 'Diego Martins', email: `diego@${DOMINIO}`, marca: 'Honda', modelo: 'Biz 125', status: 'DISPONIVEL' },
  { nome: 'Lucas Pereira', email: `lucas@${DOMINIO}`, marca: 'Honda', modelo: 'Pop 110i', status: 'EM_ENTREGA' },
  { nome: 'André Oliveira', email: `andre@${DOMINIO}`, marca: 'Yamaha', modelo: 'Fazer 250', status: 'OFFLINE' },
  { nome: 'Thiago Ribeiro', email: `thiago@${DOMINIO}`, marca: 'Honda', modelo: 'CG 160 Titan', status: 'DISPONIVEL' },
  { nome: 'Bruno Carvalho', email: `bruno@${DOMINIO}`, marca: 'Suzuki', modelo: 'Yes 125', status: 'OFFLINE' },
] as const

const ITENS: Record<TipoServico, readonly string[]> = {
  EXPRESSA: ['Medicamentos', 'Lanche para entrega', 'Peça de reposição', 'Encomenda urgente', 'Bolo de aniversário', 'Ração para pet'],
  AGENDADA: ['Caixa com roupas', 'Kit de presentes', 'Compras do mercado', 'Equipamento eletrônico', 'Pedido da loja virtual'],
  DOCUMENTOS: ['Contrato para assinatura', 'Documentos do cartório', 'Procuração', 'Notas fiscais', 'Exames médicos'],
}
const COMENTARIOS = [
  'Muito rápido, recomendo!', 'Entregador educado e cuidadoso.', 'Chegou antes do previsto.', 'Excelente atendimento.',
  'Tudo certo, pedido intacto.', 'Ótimo serviço, vou usar mais vezes.', 'Pontual e atencioso.', null, null,
  'Demorou um pouco, mas chegou bem.',
]
const MOTIVOS_CANCELAMENTO = ['Cliente desistiu do envio', 'Endereço de coleta fechado', 'Pedido duplicado', 'Item não estava pronto']
const METODOS: MetodoPagamento[] = ['PIX', 'PIX', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'DINHEIRO']
const BANDEIRAS = ['Visa', 'Mastercard', 'Elo']
const DIAS: DiaSemana[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']

function distanciaKm(a: { latitude: number | null; longitude: number | null }, b: typeof a) {
  const R = 6371, rad = (v: number) => v * Math.PI / 180
  const dLat = rad(b.latitude! - a.latitude!), dLng = rad(b.longitude! - a.longitude!)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude!)) * Math.cos(rad(b.latitude!)) * Math.sin(dLng / 2) ** 2
  // Fator 1.3 aproxima a distância real pelas ruas
  return Math.max(1.2, 2 * R * Math.asin(Math.sqrt(h)) * 1.3)
}

async function limparBanco() {
  await db.mensagem.deleteMany()
  await db.avaliacao.deleteMany()
  await db.transacaoMotoboy.deleteMany()
  await db.pagamento.deleteMany()
  await db.pedido.deleteMany()
  await db.endereco.deleteMany()
  await db.saldoMotoboy.deleteMany()
  await db.disponibilidade.deleteMany()
  await db.motoboy.deleteMany()
  await db.cliente.deleteMany()
  await db.session.deleteMany()
  await db.account.deleteMany()
  await db.user.deleteMany()
}

async function main() {
  await limparBanco()
  const senha = await bcrypt.hash(senhaDemo, 10)
  const agora = new Date()

  await db.user.create({ data: { email: `admin@${DOMINIO}`, senha, nome: 'Administrador Demo', telefone: '32999990001', role: 'ADMIN' } })

  const clientes: ClienteSeed[] = []
  for (const [i, c] of CLIENTES.entries()) {
    const user = await db.user.create({ data: {
      email: c.email, senha, nome: c.nome, telefone: `3298${String(1000000 + i * 7919).slice(-7)}`, role: 'CLIENTE',
      createdAt: new Date(agora.getTime() - int(95, 180) * 86400000),
    } })
    const cliente = await db.cliente.create({ data: {
      userId: user.id, tipoPessoa: c.tipo, razaoSocial: 'razao' in c ? c.razao : null,
      cpfCnpj: c.tipo === 'PJ' ? `${String(10000000 + i * 104729).slice(-8)}0001${String(10 + i)}` : `${String(100000000 + i * 15485863).slice(-9)}${String(10 + i)}`,
    } })
    const enderecos: Endereco[] = []
    for (let e = 0; e < 4; e++) {
      const [bairro, logradouro, lat, lng] = BAIRROS[(i * 3 + e * 5) % BAIRROS.length]
      enderecos.push(await db.endereco.create({ data: {
        clienteId: cliente.id, apelido: ['Sede', 'Casa', 'Trabalho', 'Filial'][e], cep: `360${String(10 + ((i + e) % 89)).padStart(2, '0')}000`,
        logradouro, numero: String(int(20, 1800)), bairro, cidade: 'Juiz de Fora', estado: 'MG',
        latitude: lat + between(-0.003, 0.003), longitude: lng + between(-0.003, 0.003), favorito: e === 0,
      } }))
    }
    clientes.push({ ...cliente, enderecos })
  }

  const motoboys: MotoboySeed[] = []
  for (const [i, m] of MOTOBOYS.entries()) {
    const user = await db.user.create({ data: {
      email: m.email, senha, nome: m.nome, telefone: `3299${String(2000000 + i * 6007).slice(-7)}`, role: 'MOTOBOY',
      createdAt: new Date(agora.getTime() - int(100, 200) * 86400000),
    } })
    const [, , lat, lng] = BAIRROS[(i * 2) % BAIRROS.length]
    const motoboy = await db.motoboy.create({ data: {
      userId: user.id, cnh: String(70000000000 + i * 1234567), veiculoTipo: 'Moto', veiculoMarca: m.marca, veiculoModelo: m.modelo,
      veiculoPlaca: `HM${String.fromCharCode(65 + i)}${i}${String.fromCharCode(66 + i)}${10 + i * 7}`.slice(0, 7),
      status: m.status as StatusMotoboy, latitudeAtual: lat, longitudeAtual: lng,
      ultimaAtividade: m.status === 'OFFLINE' ? new Date(agora.getTime() - int(2, 20) * 3600000) : agora,
    } })
    await db.disponibilidade.createMany({ data: DIAS.map(diaSemana => ({
      motoboyId: motoboy.id, diaSemana, horaInicio: i % 2 ? '08:00' : '10:00', horaFim: i % 2 ? '18:00' : '22:00',
    })) })
    motoboys.push({ ...motoboy, entregas: 0, notas: [], ganhos: new Prisma.Decimal(0) })
  }

  async function criarPedido(opts: {
    cliente: ClienteSeed; status: StatusPedido; createdAt: Date; motoboy?: MotoboySeed
  }) {
    const { cliente, status, createdAt, motoboy } = opts
    const tipoServico = pick<TipoServico>(['EXPRESSA', 'EXPRESSA', 'AGENDADA', 'DOCUMENTOS'])
    const origem = cliente.enderecos[0]
    const destino = pick(cliente.enderecos.slice(1))
    const km = Number(distanciaKm(origem, destino).toFixed(2))
    const valorBase = money(km * PRECO_POR_KM)
    const multiplicador = MULTIPLICADORES[tipoServico]
    const valorTotal = money(valorBase.mul(multiplicador))
    const aceitoEm = status !== 'SOLICITADO' && motoboy ? minutos(createdAt, int(1, 6)) : null
    const coletadoEm = aceitoEm && ['EM_ENTREGA', 'ENTREGUE'].includes(status) ? minutos(aceitoEm, int(6, 15)) : null
    const entregueEm = coletadoEm && status === 'ENTREGUE' ? minutos(coletadoEm, int(8, 30)) : null
    const canceladoEm = status === 'CANCELADO' ? minutos(createdAt, int(3, 25)) : null
    const metodo = pick(METODOS)
    const valores = dividirPagamento(valorTotal)
    const cartao = metodo.startsWith('CARTAO')

    const pedido = await db.pedido.create({ data: {
      clienteId: cliente.id, motoboyId: motoboy?.id ?? null, enderecoOrigemId: origem.id, enderecoDestinoId: destino.id,
      tipoServico, status, descricaoItem: pick(ITENS[tipoServico]), pesoAproximado: Number(between(0.2, 8).toFixed(1)),
      observacoes: rand() < 0.3 ? pick(['Interfone 102', 'Deixar na portaria', 'Ligar ao chegar', 'Frágil, cuidado']) : null,
      distanciaKm: km, duracaoEstimada: estimarTempo(km), valorBase, multiplicador, valorTotal,
      dataAgendada: tipoServico === 'AGENDADA' ? minutos(createdAt, int(60, 600)) : null,
      aceitoEm, coletadoEm, entregueEm, canceladoEm,
      motivoCancelamento: canceladoEm ? pick(MOTIVOS_CANCELAMENTO) : null,
      createdAt, updatedAt: entregueEm ?? canceladoEm ?? coletadoEm ?? aceitoEm ?? createdAt,
      pagamento: { create: {
        clienteId: cliente.id, ...valores, metodo, createdAt,
        status: status === 'ENTREGUE' ? 'APROVADO' : status === 'CANCELADO' ? 'CANCELADO' : metodo === 'DINHEIRO' ? 'PENDENTE' : 'APROVADO',
        aprovadoEm: status === 'CANCELADO' || (metodo === 'DINHEIRO' && status !== 'ENTREGUE') ? null : entregueEm ?? minutos(createdAt, 1),
        canceladoEm, cartaoUltimos4: cartao ? String(int(1000, 9999)) : null, cartaoBandeira: cartao ? pick(BANDEIRAS) : null,
        gatewayId: metodo === 'DINHEIRO' ? null : `demo_${Math.floor(rand() * 1e10)}`,
      } },
    } })

    if (status === 'ENTREGUE' && motoboy) {
      motoboy.entregas++
      motoboy.ganhos = motoboy.ganhos.plus(valores.valorMotoboy)
      await db.transacaoMotoboy.create({ data: {
        motoboyId: motoboy.id, pedidoId: pedido.id, tipo: 'CREDITO', status: 'CONCLUIDO', valor: valores.valorMotoboy,
        descricao: `Entrega #${pedido.id.slice(-6).toUpperCase()}`, createdAt: entregueEm!,
      } })
      if (rand() < 0.75) {
        const nota = rand() < 0.7 ? 5 : rand() < 0.8 ? 4 : 3
        motoboy.notas.push(nota)
        await db.avaliacao.create({ data: {
          pedidoId: pedido.id, motoboyId: motoboy.id, nota, comentario: pick(COMENTARIOS), createdAt: minutos(entregueEm!, int(5, 240)),
        } })
      }
    }
    return pedido
  }

  // Histórico: 90 dias, volume crescente (o negócio está "crescendo")
  for (let dia = 90; dia >= 1; dia--) {
    const base = new Date(agora)
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() - dia)
    const fimDeSemana = base.getDay() === 0
    const volume = fimDeSemana ? int(0, 2) : int(1, 3) + Math.round((90 - dia) / 30)
    for (let n = 0; n < volume; n++) {
      const createdAt = new Date(base.getTime() + int(8 * 60, 21 * 60) * 60000)
      const cancelado = rand() < 0.08
      await criarPedido({
        cliente: pick(clientes), createdAt, status: cancelado ? 'CANCELADO' : 'ENTREGUE',
        motoboy: cancelado && rand() < 0.6 ? undefined : pick(motoboys),
      })
    }
  }

  // Hoje: pedidos em andamento para demonstrar o fluxo ao vivo
  const [clienteDemo] = clientes
  const [motoboyDemo, carlos, diego, lucas] = motoboys
  const hoje = (minAtras: number) => new Date(agora.getTime() - minAtras * 60000)
  const emEntrega = await criarPedido({ cliente: clienteDemo, status: 'EM_ENTREGA', createdAt: hoje(28), motoboy: motoboyDemo })
  await criarPedido({ cliente: clienteDemo, status: 'SOLICITADO', createdAt: hoje(4) })
  await criarPedido({ cliente: clienteDemo, status: 'ENTREGUE', createdAt: hoje(180), motoboy: motoboyDemo })
  await criarPedido({ cliente: clientes[1], status: 'EM_COLETA', createdAt: hoje(15), motoboy: lucas })
  await criarPedido({ cliente: clientes[2], status: 'ACEITO', createdAt: hoje(6), motoboy: carlos })
  await criarPedido({ cliente: clientes[3], status: 'SOLICITADO', createdAt: hoje(2) })
  await criarPedido({ cliente: clientes[6], status: 'SOLICITADO', createdAt: hoje(9) })
  await criarPedido({ cliente: clientes[9], status: 'ENTREGUE', createdAt: hoje(95), motoboy: diego })

  // Posiciona o motoboy demo entre a coleta e a entrega do pedido em andamento
  const rota = await db.pedido.findUniqueOrThrow({ where: { id: emEntrega.id }, include: { enderecoOrigem: true, enderecoDestino: true } })
  await db.motoboy.update({ where: { id: motoboyDemo.id }, data: {
    latitudeAtual: (rota.enderecoOrigem.latitude! * 0.4 + rota.enderecoDestino.latitude! * 0.6),
    longitudeAtual: (rota.enderecoOrigem.longitude! * 0.4 + rota.enderecoDestino.longitude! * 0.6),
    ultimaAtividade: agora,
  } })
  await db.mensagem.createMany({ data: [
    { pedidoId: emEntrega.id, remetente: 'MOTOBOY', conteudo: 'Olá! Já coletei seu pedido, estou a caminho.', lida: true, createdAt: hoje(14) },
    { pedidoId: emEntrega.id, remetente: 'CLIENTE', conteudo: 'Perfeito, obrigado! Pode deixar na portaria.', lida: true, createdAt: hoje(12) },
    { pedidoId: emEntrega.id, remetente: 'MOTOBOY', conteudo: 'Combinado, chego em uns 10 minutos.', lida: false, createdAt: hoje(3) },
  ] })

  // Saques e saldo dos motoboys a partir dos créditos gerados
  for (const m of motoboys) {
    let sacado = new Prisma.Decimal(0)
    if (m.ganhos.gt(150)) {
      for (const diasAtras of [60, 30]) {
        const valor = money(m.ganhos.mul('0.3'))
        sacado = sacado.plus(valor)
        await db.transacaoMotoboy.create({ data: {
          motoboyId: m.id, tipo: 'SAQUE', status: 'CONCLUIDO', valor, descricao: 'Saque via PIX',
          createdAt: new Date(agora.getTime() - diasAtras * 86400000),
        } })
      }
    }
    await db.saldoMotoboy.create({ data: { motoboyId: m.id, saldoDisponivel: m.ganhos.minus(sacado), totalRecebido: m.ganhos } })
    const media = m.notas.length ? m.notas.reduce((a, b) => a + b, 0) / m.notas.length : 5
    await db.motoboy.update({ where: { id: m.id }, data: { totalEntregas: m.entregas, avaliacaoMedia: Number(media.toFixed(2)) } })
  }

  const [pedidos, entregues] = await Promise.all([db.pedido.count(), db.pedido.count({ where: { status: 'ENTREGUE' } })])
  console.log(`Demo pronta: ${clientes.length} clientes, ${motoboys.length} motoboys, ${pedidos} pedidos (${entregues} entregues).`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => db.$disconnect())
