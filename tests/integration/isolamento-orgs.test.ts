import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import type { OrgUser } from '@/lib/auth-helpers'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { criarOrg, criarUsuario, removerOrg } from './fixtures'

// Prova de isolamento multi-tenant: um usuário da central A tenta ler, listar,
// alterar e baixar dados da central B em TODAS as rotas de src/app/api.
// Uma rota nova sem caso aqui faz a suíte falhar.

const sessao = vi.hoisted(() => ({ atual: null as unknown }))
vi.mock('next-auth', () => ({ getServerSession: async () => sessao.atual, default: vi.fn() }))

const url = process.env.TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('/entrega_test')) throw new Error('Use o banco descartável entrega_test')

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>

function logarComo(user: OrgUser | null, extra: { semOrg?: boolean } = {}) {
  sessao.atual = user && { user: {
    id: user.id, email: user.email, name: 'Teste', superadmin: false,
    activeOrganizationId: extra.semOrg ? null : user.organizationId, orgRole: extra.semOrg ? null : user.orgRole,
    orgStatus: 'ATIVA', motoboyId: user.motoboyId, clienteId: user.clienteId,
  } }
}

async function chamar(rota: string, metodo: string, opts: { id?: string; query?: string; body?: unknown } = {}) {
  const mod = await import(`@/app/api/${rota}/route`) as Record<string, Handler>
  const handler = mod[metodo]
  if (!handler) throw new Error(`${rota} não exporta ${metodo}`)
  const caminho = `/api/${rota.replace('[id]', opts.id ?? 'x').replace('[token]', opts.id ?? 'x').replace('[slug]', opts.id ?? 'x')}${opts.query ? `?${opts.query}` : ''}`
  const req = new NextRequest(`http://localhost${caminho}`, {
    method: metodo,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
  return handler(req, { params: Promise.resolve({ id: opts.id ?? 'x', token: opts.id ?? 'x', slug: opts.id ?? 'x' }) })
}

;(url ? describe : describe.skip)('MySQL: isolamento entre centrais', () => {
  let db: PrismaClient
  let orgA: string, orgB: string
  let donoA: OrgUser, clienteA: OrgUser, motoboyA: OrgUser
  let clienteB: OrgUser, motoboyB: OrgUser
  const b = { pedido: '', pedidoEntregue: '', endereco: '', pagamento: '', avaliacao: '', mensagem: '', convite: '', oferta: '' }
  const TOKEN_B = 'tokenPublicoDaCentralB_0123456789abcdefABCDEF'
  const SEGREDO_B = 'Segredo da Central B'

  // Nenhuma resposta pode conter identificadores ou textos da central B
  function semDadosDeB(json: unknown) {
    const texto = JSON.stringify(json)
    for (const id of [orgB, clienteB.clienteId!, motoboyB.motoboyId!, ...Object.values(b), SEGREDO_B]) {
      expect(texto).not.toContain(id)
    }
  }
  // Listagem tem que responder 200: checar dados num JSON de erro não provaria nada
  async function listaOk(res: Response) {
    expect(res.status).toBe(200)
    semDadosDeB(await res.json())
  }
  async function negado(res: Response) {
    expect([403, 404]).toContain(res.status)
    semDadosDeB(await res.json().catch(() => null))
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url!
    db = (await import('@/lib/prisma')).default
    orgA = (await criarOrg(db, 'Central A')).id
    orgB = (await criarOrg(db, 'Central B')).id
    donoA = await criarUsuario(db, orgA, 'OWNER')
    clienteA = await criarUsuario(db, orgA, 'CLIENT')
    motoboyA = await criarUsuario(db, orgA, 'DRIVER')
    clienteB = await criarUsuario(db, orgB, 'CLIENT')
    motoboyB = await criarUsuario(db, orgB, 'DRIVER')
    await db.user.update({ where: { id: clienteB.id }, data: { nome: SEGREDO_B } })

    // Dados da central B
    const endereco = await db.endereco.create({ data: { organizationId: orgB, clienteId: clienteB.clienteId!, cep: '36000000',
      logradouro: SEGREDO_B, numero: '1', bairro: 'Centro', cidade: 'Juiz de Fora', estado: 'MG', latitude: -21.7, longitude: -43.3 } })
    b.endereco = endereco.id
    const base = { organizationId: orgB, clienteId: clienteB.clienteId!, enderecoOrigemId: endereco.id, enderecoDestinoId: endereco.id,
      tipoServico: 'EXPRESSA' as const, distanciaKm: 2, duracaoEstimada: 10, valorBase: 10, multiplicador: 1, valorTotal: 10, observacoes: SEGREDO_B }
    const pedido = await db.pedido.create({ data: { ...base, status: 'EM_ENTREGA', motoboyId: motoboyB.motoboyId, trackingToken: TOKEN_B,
      fotoComprovante: '/api/pedidos/x/comprovante/arquivo?f=x.jpg',
      pagamento: { create: { organizationId: orgB, clienteId: clienteB.clienteId!, valor: 10, metodo: 'DINHEIRO', status: 'PENDENTE' } } },
      include: { pagamento: true } })
    b.pedido = pedido.id
    b.pagamento = pedido.pagamento!.id
    const entregue = await db.pedido.create({ data: { ...base, status: 'ENTREGUE', motoboyId: motoboyB.motoboyId, entregueEm: new Date() } })
    b.pedidoEntregue = entregue.id
    b.avaliacao = (await db.avaliacao.create({ data: { organizationId: orgB, pedidoId: entregue.id, motoboyId: motoboyB.motoboyId!, nota: 5, comentario: SEGREDO_B } })).id
    b.mensagem = (await db.mensagem.create({ data: { organizationId: orgB, pedidoId: pedido.id, remetente: 'CLIENTE', conteudo: SEGREDO_B } })).id
    await db.saldoMotoboy.create({ data: { organizationId: orgB, motoboyId: motoboyB.motoboyId!, saldoDisponivel: 99 } })
    await db.transacaoMotoboy.create({ data: { organizationId: orgB, motoboyId: motoboyB.motoboyId!, pedidoId: entregue.id,
      tipo: 'CREDITO', valor: 10, descricao: SEGREDO_B, status: 'CONCLUIDO' } })

    b.oferta = (await db.dispatchOffer.create({ data: { organizationId: orgB, pedidoId: pedido.id, motoboyId: motoboyB.motoboyId!,
      tentativa: 1, expiresAt: new Date(Date.now() + 3_600_000) } })).id
    b.convite = (await db.convite.create({ data: { organizationId: orgB, papel: 'DRIVER', tokenHash: 'b'.repeat(64), nome: SEGREDO_B,
      expiresAt: new Date(Date.now() + 86_400_000), criadoPorId: clienteB.id } })).id
    await db.pricingBairro.create({ data: { organizationId: orgB, bairro: 'segredo b', nome: SEGREDO_B, valor: 77 } })
    await db.usageCounter.create({ data: { organizationId: orgB, mes: '2099-01', entregas: 4242 } })

    // Dados da central A, para as listagens terem conteúdo
    const enderecoA = await db.endereco.create({ data: { organizationId: orgA, clienteId: clienteA.clienteId!, cep: '36000000',
      logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Juiz de Fora', estado: 'MG' } })
    await db.pedido.create({ data: { organizationId: orgA, clienteId: clienteA.clienteId!, enderecoOrigemId: enderecoA.id,
      enderecoDestinoId: enderecoA.id, tipoServico: 'EXPRESSA', distanciaKm: 2, duracaoEstimada: 10, valorBase: 10, multiplicador: 1, valorTotal: 10 } })
  })

  afterAll(async () => {
    if (!db) return
    if (orgA) await removerOrg(db, orgA)
    if (orgB) await removerOrg(db, orgB)
    await db.$disconnect()
  })

  // Um caso por arquivo route.ts. Rotas públicas ou sem dados de central ficam
  // explicitamente marcadas, com o motivo.
  const casos: Record<string, () => Promise<void>> = {
    'auth/[...nextauth]': async () => { /* NextAuth: sem dados de central */ },
    'health/live': async () => { /* público, sem dados */ },
    'health/ready': async () => { /* público, sem dados */ },
    'organizacoes': async () => {
      logarComo(donoA)
      const res = await chamar('organizacoes', 'GET')
      const body = await res.json()
      expect(body.data.map((o: { id: string }) => o.id)).toEqual([orgA])
      semDadosDeB(body)
    },
    'rotas': async () => {
      // Não lê dados de central, mas exige uma central ativa
      logarComo(donoA, { semOrg: true })
      expect((await chamar('rotas', 'POST', { body: {} })).status).toBe(403)
    },
    'organizacao/precos': async () => {
      logarComo(donoA)
      await listaOk(await chamar('organizacao/precos', 'GET'))
      const tabela = { precoPorKm: 1, valorMinimo: 0, multiplicadores: { AGENDADA: 1, DOCUMENTOS: 1, EXPRESSA: 1 }, bairros: [] }
      expect((await chamar('organizacao/precos', 'PUT', { body: tabela })).status).toBe(200)
      expect(await db.pricingBairro.count({ where: { organizationId: orgB } })).toBe(1)
    },
    'organizacao/uso': async () => {
      logarComo(donoA)
      const body = await (await chamar('organizacao/uso', 'GET')).json()
      expect(JSON.stringify(body)).not.toContain('4242')
      semDadosDeB(body)
    },
    'convites': async () => {
      logarComo(donoA)
      await listaOk(await chamar('convites', 'GET'))
      const criado = await (await chamar('convites', 'POST', { body: { papel: 'DRIVER' } })).json()
      expect((await db.convite.findUniqueOrThrow({ where: { id: criado.data.id } })).organizationId).toBe(orgA)
    },
    'convites/[id]': async () => {
      logarComo(donoA)
      await negado(await chamar('convites/[id]', 'DELETE', { id: b.convite }))
      expect((await db.convite.findUniqueOrThrow({ where: { id: b.convite } })).expiresAt.getTime()).toBeGreaterThan(Date.now())
    },
    'pedidos/[id]/rastreio-publico': async () => {
      logarComo(donoA)
      await negado(await chamar('pedidos/[id]/rastreio-publico', 'POST', { id: b.pedido }))
    },
    'plataforma/organizacoes': async () => {
      logarComo(donoA)
      expect((await chamar('plataforma/organizacoes', 'GET')).status).toBe(403)
    },
    'plataforma/organizacoes/[id]': async () => {
      logarComo(donoA)
      expect((await chamar('plataforma/organizacoes/[id]', 'PATCH', { id: orgB, body: { status: 'SUSPENSA' } })).status).toBe(403)
      expect((await db.organization.findUniqueOrThrow({ where: { id: orgB } })).status).toBe('ATIVA')
    },
    'publico/centrais': async () => { /* cria uma central nova; coberto em convites-centrais.test.ts */ },
    'publico/convites/[token]': async () => {
      sessao.atual = null
      expect((await chamar('publico/convites/[token]', 'GET', { id: 'b'.repeat(43) })).status).toBe(404)
    },
    'publico/rastreio/[token]': async () => {
      // Quem tem o link vê o andamento, mas nada de telefone, documento, valor ou endereço completo
      sessao.atual = null
      const res = await chamar('publico/rastreio/[token]', 'GET', { id: TOKEN_B })
      expect(res.status).toBe(200)
      const texto = JSON.stringify(await res.json())
      for (const proibido of [SEGREDO_B, 'telefone', 'valorTotal', 'cpfCnpj', 'email', clienteB.clienteId!, orgB]) expect(texto).not.toContain(proibido)
    },
    'publico/rastreio/[token]/comprovante': async () => {
      sessao.atual = null
      // Pedido ainda em entrega: a foto só aparece depois de entregue
      expect((await chamar('publico/rastreio/[token]/comprovante', 'GET', { id: TOKEN_B })).status).toBe(404)
    },
    'fechamento': async () => {
      logarComo(donoA)
      const dia = (deslocamento: number) => new Date(Date.now() + deslocamento * 86_400_000).toISOString().slice(0, 10)
      for (const visao of ['motoboy', 'cliente']) {
        const res = await chamar('fechamento', 'GET', { query: `de=${dia(-30)}&ate=${dia(1)}&visao=${visao}` })
        expect(res.status).toBe(200)
        semDadosDeB(await res.json())
      }
    },
    'organizacao/marca': async () => {
      logarComo(donoA)
      await listaOk(await chamar('organizacao/marca', 'GET'))
      expect((await chamar('organizacao/marca', 'PUT', { body: { nomeExibicao: 'A', corPrimaria: '#000000' } })).status).toBe(200)
      expect((await db.organizationSettings.findUniqueOrThrow({ where: { organizationId: orgB } })).corPrimaria).toBeNull()
    },
    'organizacao/marca/logo': async () => {
      logarComo(donoA)
      await db.organizationSettings.update({ where: { organizationId: orgB }, data: { logoArquivo: 'logo-da-b.png' } })
      expect((await chamar('organizacao/marca/logo', 'DELETE')).status).toBe(200)
      expect((await db.organizationSettings.findUniqueOrThrow({ where: { organizationId: orgB } })).logoArquivo).toBe('logo-da-b.png')
    },
    'publico/organizacoes/[slug]': async () => {
      // Marca pública por slug (nome, cor, logo): nada de dados de operação
      sessao.atual = null
      const slugB = (await db.organization.findUniqueOrThrow({ where: { id: orgB } })).slug
      const texto = JSON.stringify(await (await chamar('publico/organizacoes/[slug]', 'GET', { id: slugB })).json())
      for (const proibido of [SEGREDO_B, clienteB.clienteId!, motoboyB.motoboyId!, 'email', 'telefone']) expect(texto).not.toContain(proibido)
    },
    'publico/organizacoes/[slug]/logo': async () => { /* imagem pública da central; coberto em marca.test.ts */ },
    'despacho/ofertas': async () => {
      logarComo(motoboyA)
      await listaOk(await chamar('despacho/ofertas', 'GET'))
    },
    'despacho/ofertas/[id]': async () => {
      logarComo(motoboyA)
      await negado(await chamar('despacho/ofertas/[id]', 'POST', { id: b.oferta, body: { acao: 'aceitar' } }))
      await negado(await chamar('despacho/ofertas/[id]', 'POST', { id: b.oferta, body: { acao: 'recusar' } }))
      expect((await db.dispatchOffer.findUniqueOrThrow({ where: { id: b.oferta } })).status).toBe('OFERTADA')
    },
    'despacho/fila': async () => {
      logarComo(donoA)
      await listaOk(await chamar('despacho/fila', 'GET'))
      await negado(await chamar('despacho/fila', 'POST', { body: { pedidoId: b.pedido } }))
    },
    'jobs/despacho': async () => {
      // Job global, sem sessão: só com CRON_SECRET
      sessao.atual = null
      expect((await chamar('jobs/despacho', 'POST')).status).toBe(401)
    },
    'dashboard': async () => {
      logarComo(donoA)
      const res = await chamar('dashboard', 'GET')
      expect(res.status).toBe(200)
      semDadosDeB(await res.json())
    },
    'pedidos': async () => {
      logarComo(donoA)
      const lista = await chamar('pedidos', 'GET')
      expect(lista.status).toBe(200)
      semDadosDeB(await lista.json())
      await listaOk(await chamar('pedidos', 'GET', { query: `clienteId=${clienteB.clienteId}` }))
      const antes = await db.pedido.count({ where: { organizationId: orgA } })
      await negado(await chamar('pedidos', 'POST', { body: { clienteId: clienteB.clienteId, enderecoOrigemId: b.endereco,
        enderecoDestinoId: b.endereco, tipoServico: 'EXPRESSA' } }))
      expect(await db.pedido.count({ where: { organizationId: orgA } })).toBe(antes)
    },
    'pedidos/[id]': async () => {
      logarComo(donoA)
      await negado(await chamar('pedidos/[id]', 'GET', { id: b.pedido }))
      await negado(await chamar('pedidos/[id]', 'PATCH', { id: b.pedido, body: { status: 'CANCELADO' } }))
      await negado(await chamar('pedidos/[id]', 'DELETE', { id: b.pedido, body: {} }))
    },
    'pedidos/[id]/rastreamento': async () => {
      logarComo(donoA)
      await negado(await chamar('pedidos/[id]/rastreamento', 'GET', { id: b.pedido }))
    },
    'pedidos/[id]/mensagens': async () => {
      logarComo(donoA)
      await negado(await chamar('pedidos/[id]/mensagens', 'GET', { id: b.pedido }))
      logarComo(clienteA)
      await negado(await chamar('pedidos/[id]/mensagens', 'POST', { id: b.pedido, body: { conteudo: 'invasão' } }))
    },
    'pedidos/[id]/comprovante': async () => {
      logarComo(donoA)
      await negado(await chamar('pedidos/[id]/comprovante', 'GET', { id: b.pedido }))
      logarComo(motoboyA)
      await negado(await chamar('pedidos/[id]/comprovante', 'POST', { id: b.pedido }))
    },
    'pedidos/[id]/comprovante/arquivo': async () => {
      logarComo(donoA)
      await negado(await chamar('pedidos/[id]/comprovante/arquivo', 'GET', { id: b.pedido }))
    },
    'motoboys': async () => {
      logarComo(donoA)
      const res = await chamar('motoboys', 'GET')
      expect(res.status).toBe(200)
      semDadosDeB(await res.json())
      // POST é o cadastro público (central padrão da instalação até a Etapa 3): não aceita escolher outra central
    },
    'motoboys/[id]': async () => {
      logarComo(donoA)
      await negado(await chamar('motoboys/[id]', 'GET', { id: motoboyB.motoboyId! }))
      await negado(await chamar('motoboys/[id]', 'PATCH', { id: motoboyB.motoboyId!, body: { veiculoModelo: 'invadido' } }))
      await negado(await chamar('motoboys/[id]', 'DELETE', { id: motoboyB.motoboyId! }))
    },
    'motoboys/[id]/aprovacao': async () => {
      logarComo(donoA)
      await negado(await chamar('motoboys/[id]/aprovacao', 'PATCH', { id: motoboyB.motoboyId!, body: { aprovacao: 'SUSPENSO', motivo: 'x' } }))
    },
    'motoboys/[id]/localizacao': async () => {
      logarComo(donoA)
      await negado(await chamar('motoboys/[id]/localizacao', 'GET', { id: motoboyB.motoboyId! }))
      logarComo(motoboyA)
      await negado(await chamar('motoboys/[id]/localizacao', 'POST', { id: motoboyB.motoboyId!, body: { latitude: 1, longitude: 1 } }))
    },
    'motoboys/[id]/resumo': async () => {
      logarComo(donoA)
      await negado(await chamar('motoboys/[id]/resumo', 'GET', { id: motoboyB.motoboyId! }))
    },
    'motoboys/[id]/saldo': async () => {
      logarComo(donoA)
      await negado(await chamar('motoboys/[id]/saldo', 'GET', { id: motoboyB.motoboyId! }))
    },
    'motoboys/[id]/transacoes': async () => {
      logarComo(donoA)
      await negado(await chamar('motoboys/[id]/transacoes', 'GET', { id: motoboyB.motoboyId! }))
    },
    'clientes': async () => {
      logarComo(donoA)
      const res = await chamar('clientes', 'GET')
      expect(res.status).toBe(200)
      semDadosDeB(await res.json())
    },
    'clientes/[id]': async () => {
      logarComo(donoA)
      await negado(await chamar('clientes/[id]', 'GET', { id: clienteB.clienteId! }))
      await negado(await chamar('clientes/[id]', 'PATCH', { id: clienteB.clienteId!, body: { nome: 'invadido' } }))
      await negado(await chamar('clientes/[id]', 'DELETE', { id: clienteB.clienteId! }))
    },
    'enderecos': async () => {
      logarComo(donoA)
      await negado(await chamar('enderecos', 'GET', { query: `clienteId=${clienteB.clienteId}` }))
      await negado(await chamar('enderecos', 'POST', { body: { clienteId: clienteB.clienteId, cep: '36000000', logradouro: 'x',
        numero: '1', bairro: 'x', cidade: 'x', estado: 'MG', latitude: 1, longitude: 1 } }))
    },
    'enderecos/[id]': async () => {
      logarComo(donoA)
      await negado(await chamar('enderecos/[id]', 'GET', { id: b.endereco }))
      await negado(await chamar('enderecos/[id]', 'PATCH', { id: b.endereco, body: { apelido: 'invadido' } }))
      await negado(await chamar('enderecos/[id]', 'DELETE', { id: b.endereco }))
    },
    'avaliacoes': async () => {
      logarComo(donoA)
      await listaOk(await chamar('avaliacoes', 'GET'))
      await listaOk(await chamar('avaliacoes', 'GET', { query: `motoboyId=${motoboyB.motoboyId}` }))
      await negado(await chamar('avaliacoes', 'POST', { body: { pedidoId: b.pedidoEntregue, nota: 1 } }))
      logarComo(clienteA)
      await negado(await chamar('avaliacoes', 'POST', { body: { pedidoId: b.pedidoEntregue, nota: 1 } }))
    },
    'pagamentos': async () => {
      logarComo(donoA)
      await listaOk(await chamar('pagamentos', 'GET'))
      await negado(await chamar('pagamentos', 'POST', { body: { pedidoId: b.pedido, metodo: 'DINHEIRO' } }))
    },
    'pagamentos/[id]': async () => {
      logarComo(donoA)
      await negado(await chamar('pagamentos/[id]', 'GET', { id: b.pagamento }))
      await negado(await chamar('pagamentos/[id]', 'POST', { id: b.pagamento, body: { acao: 'confirmar_dinheiro' } }))
      await negado(await chamar('pagamentos/[id]', 'DELETE', { id: b.pagamento }))
    },
  }

  it('toda rota de src/app/api tem um caso de isolamento', () => {
    const raiz = path.join(process.cwd(), 'src/app/api')
    const rotas: string[] = []
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const atual = path.join(dir, nome)
        if (statSync(atual).isDirectory()) varrer(atual)
        else if (nome === 'route.ts') rotas.push(path.relative(raiz, dir))
      }
    }
    varrer(raiz)
    expect(rotas.filter(r => !(r in casos))).toEqual([])
  })

  for (const [rota, executar] of Object.entries(casos)) {
    it(`central A não acessa dados da central B: /api/${rota}`, executar)
  }

  it('dados da central B continuam intactos depois das tentativas', async () => {
    const pedido = await db.pedido.findUniqueOrThrow({ where: { id: b.pedido }, include: { pagamento: true } })
    expect(pedido.status).toBe('EM_ENTREGA')
    expect(pedido.pagamento?.status).toBe('PENDENTE')
    const motoboy = await db.motoboy.findUniqueOrThrow({ where: { id: motoboyB.motoboyId! } })
    expect(motoboy).toMatchObject({ aprovacao: 'APROVADO', veiculoModelo: 'Teste', latitudeAtual: null })
    expect(await db.cliente.findUnique({ where: { id: clienteB.clienteId! } })).not.toBeNull()
    expect(await db.endereco.findUniqueOrThrow({ where: { id: b.endereco } })).toMatchObject({ apelido: null })
    expect(await db.mensagem.count({ where: { pedidoId: b.pedido } })).toBe(1)
    expect(await db.avaliacao.count({ where: { pedidoId: b.pedidoEntregue } })).toBe(1)
  })
})
