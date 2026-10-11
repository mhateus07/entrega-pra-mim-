import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import type { OrgUser } from '@/lib/auth-helpers'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { criarOrg, criarUsuario, removerOrg } from './fixtures'

const sessao = vi.hoisted(() => ({ atual: null as unknown }))
vi.mock('next-auth', () => ({ getServerSession: async () => sessao.atual, default: vi.fn() }))

const url = process.env.TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('/entrega_test')) throw new Error('Use o banco descartável entrega_test')

function logarComo(user: OrgUser | null, orgStatus = 'ATIVA', superadmin = false) {
  sessao.atual = user && { user: { id: user.id, email: user.email, name: 'Teste', superadmin, activeOrganizationId: user.organizationId,
    orgRole: user.orgRole, orgStatus, motoboyId: user.motoboyId, clienteId: user.clienteId } }
}
// IP diferente por requisição: o rate limit de cadastro (10/min por IP) não interfere no teste
const req = (corpo?: unknown, metodo = 'POST') => new NextRequest('http://localhost/x', {
  method: metodo, headers: { 'x-real-ip': `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
  ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
})
let seq = 0
const motoboyNovo = (email: string) => {
  seq++
  return { email, senha: 'moto-azul-2026', nome: 'Motoboy Convidado', telefone: '32999990000',
    cnh: String(10000000000 + Date.now() % 1e9 + seq), veiculoTipo: 'Moto', veiculoMarca: 'Honda', veiculoModelo: 'CG',
    veiculoPlaca: `TST${seq % 10}A${String(seq).padStart(2, '0').slice(-2)}` }
}

;(url ? describe : describe.skip)('MySQL: convites, centrais novas e rastreio público', () => {
  let db: PrismaClient
  const orgs: string[] = []
  let orgA: string, orgB: string
  let donoA: OrgUser

  async function gerarConvite(corpo: Record<string, unknown>, como: OrgUser = donoA) {
    logarComo(como)
    const { POST } = await import('@/app/api/convites/route')
    const res = await POST(req(corpo))
    const body = await res.json()
    return { status: res.status, token: body.data?.url?.split('/convite/')[1] as string, id: body.data?.id as string }
  }
  async function aceitar(token: string, corpo: unknown) {
    sessao.atual = null
    const { POST } = await import('@/app/api/publico/convites/[token]/route')
    const res = await POST(req(corpo), { params: Promise.resolve({ token }) })
    return { status: res.status, body: await res.json() }
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url!
    db = (await import('@/lib/prisma')).default
    orgA = (await criarOrg(db, 'Central A')).id
    orgB = (await criarOrg(db, 'Central B')).id
    orgs.push(orgA, orgB)
    donoA = await criarUsuario(db, orgA, 'OWNER')
  })

  afterAll(async () => {
    if (!db) return
    for (const id of orgs) await removerOrg(db, id).catch(() => {})
    await db.$disconnect()
  })

  it('motoboy aceita o convite: conta nova, vínculo DRIVER e cadastro pendente; o link não vale de novo', async () => {
    const convite = await gerarConvite({ papel: 'DRIVER', nome: 'Carlos' })
    expect(convite.status).toBe(201)
    expect(convite.token).toHaveLength(43)
    const email = `${randomUUID()}@test.local`
    const aceite = await aceitar(convite.token, motoboyNovo(email))
    expect(aceite.status).toBe(201)
    const user = await db.user.findUniqueOrThrow({ where: { email }, include: { memberships: true, motoboys: true } })
    expect(user.memberships).toMatchObject([{ organizationId: orgA, papel: 'DRIVER' }])
    expect(user.motoboys[0]).toMatchObject({ organizationId: orgA, aprovacao: 'PENDENTE_APROVACAO' })
    expect((await aceitar(convite.token, motoboyNovo(`${randomUUID()}@test.local`))).status).toBe(404)
  })

  it('convite para um e-mail só aceita esse e-mail', async () => {
    const email = `${randomUUID()}@test.local`
    const convite = await gerarConvite({ papel: 'CLIENT', email })
    const errado = await aceitar(convite.token, { email: `${randomUUID()}@test.local`, senha: 'moto-azul-2026', nome: 'Farmácia' })
    expect(errado.status).toBe(400)
    expect((await aceitar(convite.token, { email, senha: 'moto-azul-2026', nome: 'Farmácia' })).status).toBe(201)
  })

  it('quem já tem conta em outra central entra com a mesma senha; senha errada não revela a conta', async () => {
    const clienteB = await criarUsuario(db, orgB, 'CLIENT')
    await db.user.update({ where: { id: clienteB.id }, data: { senha: await bcrypt.hash('senha-da-conta-1', 4) } })
    const convite = await gerarConvite({ papel: 'CLIENT' })
    const errada = await aceitar(convite.token, { email: clienteB.email, senha: 'outra-senha-123', nome: 'Xx' })
    expect(errada.status).toBe(400)
    expect(errada.body.error).toMatch(/já em uso nesta central/)
    // Senha errada não consome o convite
    expect((await aceitar(convite.token, { email: clienteB.email, senha: 'senha-da-conta-1', nome: 'Xx' })).status).toBe(201)
    const membros = await db.organizationMember.findMany({ where: { userId: clienteB.id } })
    expect(membros.map(m => m.organizationId).sort()).toEqual([orgA, orgB].sort())
    expect(await db.cliente.count({ where: { userId: clienteB.id } })).toBe(2)
  })

  it('dois aceites simultâneos do mesmo link: só um passa', async () => {
    const convite = await gerarConvite({ papel: 'CLIENT' })
    const resultados = await Promise.all([1, 2, 3].map(() => aceitar(convite.token, {
      email: `${randomUUID()}@test.local`, senha: 'moto-azul-2026', nome: 'Concorrente' })))
    expect(resultados.filter(r => r.status === 201)).toHaveLength(1)
  })

  it('convite revogado deixa de funcionar; despachante não convida despachante', async () => {
    const convite = await gerarConvite({ papel: 'DRIVER' })
    logarComo(donoA)
    const { DELETE } = await import('@/app/api/convites/[id]/route')
    expect((await DELETE(req(undefined, 'DELETE'), { params: Promise.resolve({ id: convite.id }) })).status).toBe(200)
    expect((await aceitar(convite.token, motoboyNovo(`${randomUUID()}@test.local`))).status).toBe(404)

    const despachante = await criarUsuario(db, orgA, 'DISPATCHER')
    expect((await gerarConvite({ papel: 'DISPATCHER' }, despachante)).status).toBe(403)
    expect((await gerarConvite({ papel: 'DRIVER' }, despachante)).status).toBe(201)
  })

  it('"criar minha central" gera central pendente com o dono; só opera depois da ativação', async () => {
    sessao.atual = null
    const email = `${randomUUID()}@test.local`
    const { POST } = await import('@/app/api/publico/centrais/route')
    const res = await POST(req({ nomeCentral: 'Moto Rápida Teste', nome: 'Dona', email, senha: 'moto-azul-2026' }))
    expect(res.status).toBe(201)
    const org = await db.organization.findFirstOrThrow({ where: { membros: { some: { user: { email } } } }, include: { pricingRule: true } })
    orgs.push(org.id)
    expect(org).toMatchObject({ status: 'PENDENTE', plano: 'ESSENCIAL' })
    expect(org.slug).toMatch(/^moto-rapida-teste/)
    expect(org.pricingRule).not.toBeNull()
    const dono = await db.user.findUniqueOrThrow({ where: { email }, include: { memberships: true } })
    expect(dono.memberships[0].papel).toBe('OWNER')

    const owner: OrgUser = { id: dono.id, email, superadmin: false, organizationId: org.id, orgRole: 'OWNER', motoboyId: null, clienteId: null }
    logarComo(owner, 'PENDENTE')
    const { GET } = await import('@/app/api/pedidos/route')
    const bloqueado = await GET(new NextRequest('http://localhost/api/pedidos'))
    expect(bloqueado.status).toBe(403)
    expect((await bloqueado.json()).error).toMatch(/aguardando ativação/)

    // Superadmin ativa a central
    logarComo({ ...owner, id: 'superadmin' }, 'ATIVA', true)
    const { PATCH } = await import('@/app/api/plataforma/organizacoes/[id]/route')
    expect((await PATCH(req({ status: 'ATIVA' }, 'PATCH'), { params: Promise.resolve({ id: org.id }) })).status).toBe(200)
    logarComo(owner, 'ATIVA')
    expect((await GET(new NextRequest('http://localhost/api/pedidos'))).status).toBe(200)
  })

  it('rastreio público: posição só durante a entrega e foto só depois de entregue', async () => {
    const cliente = await criarUsuario(db, orgA, 'CLIENT')
    const motoboy = await criarUsuario(db, orgA, 'DRIVER')
    await db.motoboy.update({ where: { id: motoboy.motoboyId! }, data: { latitudeAtual: -21.77, longitudeAtual: -43.36 } })
    const endereco = await db.endereco.create({ data: { organizationId: orgA, clienteId: cliente.clienteId!, cep: '36000000',
      logradouro: 'Rua Secreta 999', numero: '999', bairro: 'Centro', cidade: 'Juiz de Fora', estado: 'MG', latitude: -21.78, longitude: -43.37 } })
    const token = `tok_${randomUUID().replace(/-/g, '')}xx`
    const pedido = await db.pedido.create({ data: { organizationId: orgA, clienteId: cliente.clienteId!, motoboyId: motoboy.motoboyId,
      enderecoOrigemId: endereco.id, enderecoDestinoId: endereco.id, tipoServico: 'EXPRESSA', status: 'EM_COLETA', trackingToken: token,
      distanciaKm: 3, duracaoEstimada: 12, valorBase: 10, multiplicador: 1, valorTotal: 10 } })
    const { GET } = await import('@/app/api/publico/rastreio/[token]/route')
    const ler = async () => (await (await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ token }) })).json()).data

    sessao.atual = null
    const coleta = await ler()
    expect(coleta.posicao).toBeNull()
    expect(coleta.destino.latitude).toBeUndefined()
    expect(JSON.stringify(coleta)).not.toContain('Rua Secreta')

    await db.pedido.update({ where: { id: pedido.id }, data: { status: 'EM_ENTREGA' } })
    const entrega = await ler()
    expect(entrega.posicao).toMatchObject({ latitude: -21.77, longitude: -43.36 })
    expect(entrega.etaMinutos).toBeGreaterThan(0)
    expect(entrega.comprovanteUrl).toBeNull()

    await db.pedido.update({ where: { id: pedido.id }, data: { status: 'ENTREGUE', fotoComprovante: '/api/pedidos/x/comprovante/arquivo?f=x.jpg' } })
    const entregue = await ler()
    expect(entregue.posicao).toBeNull()
    expect(entregue.comprovanteUrl).toBe(`/api/publico/rastreio/${token}/comprovante`)
  })
})
