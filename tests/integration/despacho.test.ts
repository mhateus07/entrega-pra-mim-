import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import type { OrgUser } from '@/lib/auth-helpers'
import { criarOrg, criarUsuario, removerOrg } from './fixtures'

const sessao = vi.hoisted(() => ({ atual: null as unknown }))
vi.mock('next-auth', () => ({ getServerSession: async () => sessao.atual, default: vi.fn() }))
const url = process.env.TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('/entrega_test')) throw new Error('Use o banco descartável entrega_test')

function logarComo(user: OrgUser) {
  sessao.atual = { user: { id: user.id, email: user.email, name: 'T', superadmin: false, activeOrganizationId: user.organizationId,
    orgRole: user.orgRole, orgStatus: 'ATIVA', motoboyId: user.motoboyId, clienteId: user.clienteId } }
}

;(url ? describe : describe.skip)('MySQL: despacho com oferta', () => {
  let db: PrismaClient
  let orgId: string
  let dono: OrgUser, cliente: OrgUser
  let perto: OrgUser, medio: OrgUser, longe: OrgUser
  let enderecoId: string
  let despacho: typeof import('@/lib/despacho')

  async function novoPedido() {
    return (await db.pedido.create({ data: { organizationId: orgId, clienteId: cliente.clienteId!, enderecoOrigemId: enderecoId,
      enderecoDestinoId: enderecoId, tipoServico: 'EXPRESSA', distanciaKm: 2, duracaoEstimada: 10, valorBase: 10, multiplicador: 1, valorTotal: 10 } })).id
  }
  async function vencerOferta(pedidoId: string) {
    await db.dispatchOffer.updateMany({ where: { pedidoId, status: 'OFERTADA' }, data: { expiresAt: new Date(Date.now() - 1000) } })
  }
  const motoboy = (id: string) => db.motoboy.findUniqueOrThrow({ where: { id } })

  beforeAll(async () => {
    process.env.DATABASE_URL = url!
    db = (await import('@/lib/prisma')).default
    despacho = await import('@/lib/despacho')
    orgId = (await criarOrg(db, 'Central despacho')).id
    // Corrida mínima de R$ 10: o ganho mostrado ao motoboy (70%) é R$ 7
    await db.pricingRule.create({ data: { organizationId: orgId, valorMinimo: 10 } })
    dono = await criarUsuario(db, orgId, 'OWNER')
    cliente = await criarUsuario(db, orgId, 'CLIENT')
    perto = await criarUsuario(db, orgId, 'DRIVER')
    medio = await criarUsuario(db, orgId, 'DRIVER')
    longe = await criarUsuario(db, orgId, 'DRIVER')
    enderecoId = (await db.endereco.create({ data: { organizationId: orgId, clienteId: cliente.clienteId!, cep: '36000000', logradouro: 'R',
      numero: '1', bairro: 'Centro', cidade: 'JF', estado: 'MG', latitude: -21.76, longitude: -43.35 } })).id
  })

  // Cada caso começa com os três motoboys online, livres e a distâncias diferentes da coleta
  beforeEach(async () => {
    await db.dispatchOffer.deleteMany({ where: { organizationId: orgId } })
    await db.pedido.deleteMany({ where: { organizationId: orgId } })
    for (const [m, delta] of [[perto, 0.001], [medio, 0.02], [longe, 0.08]] as const) {
      await db.motoboy.update({ where: { id: m.motoboyId! }, data: {
        status: 'DISPONIVEL', latitudeAtual: -21.76 + delta, longitudeAtual: -43.35, avaliacaoMedia: 5, ultimaAtividade: new Date(),
      } })
    }
  })

  afterAll(async () => {
    if (!db) return
    if (orgId) await removerOrg(db, orgId)
    await db.$disconnect()
  })

  it('oferece primeiro ao motoboy de melhor score (mais perto), com prazo de 90 s', async () => {
    const pedidoId = await novoPedido()
    const r = await despacho.ofertarPedido(pedidoId)
    expect(r).toMatchObject({ tipo: 'ofertado', motoboyId: perto.motoboyId })
    if (r.tipo !== 'ofertado') return
    const prazo = (r.expiresAt.getTime() - Date.now()) / 1000
    expect(prazo).toBeGreaterThan(85)
    expect(prazo).toBeLessThanOrEqual(90)
    // Chamar de novo não cria segunda oferta
    expect(await despacho.ofertarPedido(pedidoId)).toMatchObject({ tipo: 'ignorado' })
    expect(await db.dispatchOffer.count({ where: { pedidoId } })).toBe(1)
  })

  it('concorrência: aceites simultâneos da mesma oferta e atribuição manual ao mesmo tempo — só um vence', async () => {
    const pedidoId = await novoPedido()
    const r = await despacho.ofertarPedido(pedidoId)
    if (r.tipo !== 'ofertado') throw new Error('esperava oferta')
    const { alterarStatusPedido } = await import('@/lib/pedido-status')
    const tentativas = await Promise.allSettled([
      ...Array.from({ length: 5 }, () => despacho.aceitarOferta(r.ofertaId, perto)),
      alterarStatusPedido(pedidoId, dono, { status: 'ACEITO', motoboyId: medio.motoboyId! }),
      despacho.aceitarOferta(r.ofertaId, medio), // oferta de outro motoboy
    ])
    expect(tentativas.filter(t => t.status === 'fulfilled')).toHaveLength(1)
    const pedido = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId } })
    expect(pedido.status).toBe('ACEITO')
    const ocupados = (await Promise.all([perto, medio, longe].map(m => motoboy(m.motoboyId!)))).filter(m => m.status === 'EM_ENTREGA')
    expect(ocupados.map(m => m.id)).toEqual([pedido.motoboyId])
    expect(await db.dispatchOffer.count({ where: { pedidoId, status: 'OFERTADA' } })).toBe(0)
  })

  it('expiração gera nova oferta para o próximo motoboy', async () => {
    const pedidoId = await novoPedido()
    await despacho.ofertarPedido(pedidoId)
    await vencerOferta(pedidoId)
    const resumo = await despacho.processarDespacho()
    expect(resumo.ofertados).toBeGreaterThanOrEqual(1)
    const ofertas = await db.dispatchOffer.findMany({ where: { pedidoId }, orderBy: { tentativa: 'asc' } })
    expect(ofertas.map(o => [o.motoboyId, o.status, o.tentativa])).toEqual([
      [perto.motoboyId, 'EXPIRADA', 1],
      [medio.motoboyId, 'OFERTADA', 2],
    ])
    // Oferta vencida não pode mais ser aceita
    await expect(despacho.aceitarOferta(ofertas[0].id, perto)).rejects.toMatchObject({ status: 409 })
  })

  it('após 3 tentativas sem aceite o pedido cai na fila manual do despachante', async () => {
    const pedidoId = await novoPedido()
    await despacho.ofertarPedido(pedidoId)
    for (let i = 0; i < 3; i++) {
      await vencerOferta(pedidoId)
      await despacho.processarDespacho()
    }
    const pedido = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId } })
    expect(pedido).toMatchObject({ despachoManual: true, tentativasDespacho: 3, motoboyId: null })
    expect(await db.dispatchOffer.count({ where: { pedidoId, status: 'OFERTADA' } })).toBe(0)

    logarComo(dono)
    const { GET, POST } = await import('@/app/api/despacho/fila/route')
    const fila = (await (await GET()).json()).data
    expect(fila.manual.map((p: { id: string }) => p.id)).toContain(pedidoId)

    // "Ofertar de novo" começa um novo ciclo, voltando ao melhor motoboy
    const res = await POST(new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ pedidoId }) }))
    expect((await res.json()).data).toMatchObject({ tipo: 'ofertado', motoboyId: perto.motoboyId })
  })

  it('recusa passa a corrida ao próximo; sem ninguém online vai direto para a fila', async () => {
    const pedidoId = await novoPedido()
    const r = await despacho.ofertarPedido(pedidoId)
    if (r.tipo !== 'ofertado') throw new Error('esperava oferta')
    expect(await despacho.recusarOferta(r.ofertaId, perto)).toMatchObject({ tipo: 'ofertado', motoboyId: medio.motoboyId })

    await db.motoboy.updateMany({ where: { organizationId: orgId }, data: { status: 'OFFLINE' } })
    const outro = await novoPedido()
    expect(await despacho.ofertarPedido(outro)).toEqual({ tipo: 'manual', motivo: 'sem_motoboy' })
  })

  it('não oferece duas corridas ao mesmo tempo para o mesmo motoboy', async () => {
    const a = await novoPedido()
    const b = await novoPedido()
    const ra = await despacho.ofertarPedido(a)
    const rb = await despacho.ofertarPedido(b)
    expect(ra).toMatchObject({ motoboyId: perto.motoboyId })
    expect(rb).toMatchObject({ motoboyId: medio.motoboyId })
  })

  it('cancelar o pedido encerra a oferta; motoboy só responde às próprias ofertas', async () => {
    const pedidoId = await novoPedido()
    const r = await despacho.ofertarPedido(pedidoId)
    if (r.tipo !== 'ofertado') throw new Error('esperava oferta')
    await expect(despacho.aceitarOferta(r.ofertaId, longe)).rejects.toMatchObject({ status: 404 })
    const { alterarStatusPedido } = await import('@/lib/pedido-status')
    await alterarStatusPedido(pedidoId, cliente, { status: 'CANCELADO' })
    expect((await db.dispatchOffer.findUniqueOrThrow({ where: { id: r.ofertaId } })).status).toBe('CANCELADA')
    await expect(despacho.aceitarOferta(r.ofertaId, perto)).rejects.toMatchObject({ status: 409 })
  })

  it('pedido novo pela API já sai ofertado; motoboy não aceita pelo PATCH', async () => {
    logarComo(cliente)
    const { POST } = await import('@/app/api/pedidos/route')
    const res = await POST(new NextRequest('http://localhost/api/pedidos', { method: 'POST', body: JSON.stringify({
      clienteId: cliente.clienteId, enderecoOrigemId: enderecoId, enderecoDestinoId: enderecoId, tipoServico: 'EXPRESSA' }) }))
    const criado = (await res.json()).data
    expect(await db.dispatchOffer.findFirst({ where: { pedidoId: criado.id, status: 'OFERTADA' } })).toMatchObject({ motoboyId: perto.motoboyId })

    logarComo(perto)
    const { PATCH } = await import('@/app/api/pedidos/[id]/route')
    const patch = await PATCH(new NextRequest('http://localhost/x', { method: 'PATCH', body: JSON.stringify({ status: 'ACEITO' }) }),
      { params: Promise.resolve({ id: criado.id }) })
    expect(patch.status).toBe(403)

    const { GET } = await import('@/app/api/despacho/ofertas/route')
    const ofertas = (await (await GET()).json()).data
    expect(ofertas).toHaveLength(1)
    expect(ofertas[0].pedido).toMatchObject({ id: criado.id, seuGanho: 7 })
    expect(JSON.stringify(ofertas[0])).not.toContain('logradouro')
  })

  it('job de despacho exige CRON_SECRET', async () => {
    const { POST } = await import('@/app/api/jobs/despacho/route')
    const chamar = (auth?: string) => POST(new NextRequest('http://localhost/api/jobs/despacho', { method: 'POST', headers: auth ? { authorization: auth } : {} }))
    vi.stubEnv('CRON_SECRET', '')
    expect((await chamar('Bearer qualquer')).status).toBe(401)
    vi.stubEnv('CRON_SECRET', 'segredo-do-cron-com-32-caracteres!!')
    expect((await chamar()).status).toBe(401)
    expect((await chamar('Bearer errado-errado-errado-errado-errado')).status).toBe(401)
    expect((await chamar('Bearer segredo-do-cron-com-32-caracteres!!')).status).toBe(200)
    vi.unstubAllEnvs()
  })
})
