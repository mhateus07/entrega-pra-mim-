import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import type { OrgUser } from '@/lib/auth-helpers'
import { criarOrg, criarUsuario, removerOrg } from './fixtures'

const sessao = vi.hoisted(() => ({ atual: null as unknown }))
vi.mock('next-auth', () => ({ getServerSession: async () => sessao.atual, default: vi.fn() }))

const url = process.env.TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('/entrega_test')) throw new Error('Use o banco descartável entrega_test')

function logarComo(user: OrgUser) {
  sessao.atual = { user: { id: user.id, email: user.email, name: 'Teste', superadmin: false, activeOrganizationId: user.organizationId,
    orgRole: user.orgRole, orgStatus: 'ATIVA', motoboyId: user.motoboyId, clienteId: user.clienteId } }
}

;(url ? describe : describe.skip)('MySQL: preço por central e limites do plano', () => {
  let db: PrismaClient
  let orgId: string
  let dono: OrgUser, cliente: OrgUser, motoboy: OrgUser
  let origemId: string, destinoId: string
  let mes: string

  async function criarPedido() {
    const { POST } = await import('@/app/api/pedidos/route')
    return POST(new NextRequest('http://localhost/api/pedidos', { method: 'POST', body: JSON.stringify({
      clienteId: cliente.clienteId, enderecoOrigemId: origemId, enderecoDestinoId: destinoId, tipoServico: 'DOCUMENTOS',
    }) }))
  }
  const definirUso = (entregas: number) => db.usageCounter.upsert({
    where: { organizationId_mes: { organizationId: orgId, mes } },
    create: { organizationId: orgId, mes, entregas }, update: { entregas },
  })

  beforeAll(async () => {
    process.env.DATABASE_URL = url!
    db = (await import('@/lib/prisma')).default
    mes = (await import('@/lib/uso')).mesReferencia()
    const org = await criarOrg(db)
    orgId = org.id
    await db.organization.update({ where: { id: orgId }, data: { plano: 'ESSENCIAL' } })
    dono = await criarUsuario(db, orgId, 'OWNER')
    cliente = await criarUsuario(db, orgId, 'CLIENT')
    motoboy = await criarUsuario(db, orgId, 'DRIVER')
    const base = { organizationId: orgId, clienteId: cliente.clienteId!, cep: '36000000', numero: '1', cidade: 'Juiz de Fora', estado: 'MG' }
    origemId = (await db.endereco.create({ data: { ...base, logradouro: 'Rua A', bairro: 'Centro', latitude: -21.76, longitude: -43.35 } })).id
    destinoId = (await db.endereco.create({ data: { ...base, logradouro: 'Rua B', bairro: 'São Mateus', latitude: -21.78, longitude: -43.37 } })).id
    await db.pricingRule.create({ data: { organizationId: orgId, precoPorKm: 2, valorMinimo: 5, multAgendada: 1, multDocumentos: 1.25, multExpressa: 1.5 } })
    await db.pricingBairro.create({ data: { organizationId: orgId, bairro: 'sao mateus', nome: 'São Mateus', valor: 20 } })
  })

  afterAll(async () => {
    if (!db) return
    if (orgId) await removerOrg(db, orgId)
    await db.$disconnect()
  })

  it('aplica a tabela da central (bairro fixo × multiplicador) e conta a entrega do mês', async () => {
    await definirUso(10)
    logarComo(dono)
    const res = await criarPedido()
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data).toMatchObject({ valorBase: 20, multiplicador: 1.25, valorTotal: 25 })
    expect(body.aviso).toBeUndefined()
    expect((await db.usageCounter.findUniqueOrThrow({ where: { organizationId_mes: { organizationId: orgId, mes } } })).entregas).toBe(11)
  })

  it('acima do limite aceita com aviso; acima de 120% bloqueia sem criar pedido', async () => {
    logarComo(dono)
    await definirUso(600)
    const comAviso = await criarPedido()
    expect(comAviso.status).toBe(201)
    expect((await comAviso.json()).aviso).toMatch(/passou do limite de 600/)

    await definirUso(720)
    const antes = await db.pedido.count({ where: { organizationId: orgId } })
    const bloqueado = await criarPedido()
    expect(bloqueado.status).toBe(403)
    expect((await bloqueado.json()).error).toMatch(/Limite do plano Essencial/)
    expect(await db.pedido.count({ where: { organizationId: orgId } })).toBe(antes)
  })

  it('preço fica congelado no pedido mesmo se a tabela mudar e o status avançar', async () => {
    await definirUso(0)
    logarComo(dono)
    const criado = (await (await criarPedido()).json()).data
    await db.pricingRule.update({ where: { organizationId: orgId }, data: { precoPorKm: 99, valorMinimo: 500 } })
    await db.pricingBairro.deleteMany({ where: { organizationId: orgId } })

    const { alterarStatusPedido } = await import('@/lib/pedido-status')
    await alterarStatusPedido(criado.id, motoboy, { status: 'ACEITO' })
    await alterarStatusPedido(criado.id, motoboy, { status: 'EM_COLETA' })
    await alterarStatusPedido(criado.id, motoboy, { status: 'EM_ENTREGA' })
    await db.pedido.update({ where: { id: criado.id }, data: { fotoComprovante: '/api/pedidos/x/comprovante/arquivo?f=x.jpg' } })
    await alterarStatusPedido(criado.id, motoboy, { status: 'ENTREGUE' })

    const final = await db.pedido.findUniqueOrThrow({ where: { id: criado.id } })
    expect(final.status).toBe('ENTREGUE')
    expect(final.valorTotal.toNumber()).toBe(criado.valorTotal)
    expect(final.valorBase.toNumber()).toBe(criado.valorBase)
  })

  it('não aprova motoboy além do limite do plano', async () => {
    // Essencial: 5 motoboys. Já existe 1 aprovado; cria mais 4 aprovados e 1 pendente
    for (let i = 0; i < 4; i++) await criarUsuario(db, orgId, 'DRIVER')
    const pendente = await criarUsuario(db, orgId, 'DRIVER', { aprovado: false })
    logarComo(dono)
    const { PATCH } = await import('@/app/api/motoboys/[id]/aprovacao/route')
    const res = await PATCH(new NextRequest('http://localhost/x', { method: 'PATCH', body: JSON.stringify({ aprovacao: 'APROVADO' }) }),
      { params: Promise.resolve({ id: pendente.motoboyId! }) })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/até 5 motoboys/)
    expect((await db.motoboy.findUniqueOrThrow({ where: { id: pendente.motoboyId! } })).aprovacao).toBe('PENDENTE_APROVACAO')
  })

  it('só o dono altera a tabela de preço', async () => {
    const despachante = await criarUsuario(db, orgId, 'DISPATCHER')
    logarComo(despachante)
    const { PUT } = await import('@/app/api/organizacao/precos/route')
    const tabela = { precoPorKm: 1, valorMinimo: 0, multiplicadores: { AGENDADA: 1, DOCUMENTOS: 1, EXPRESSA: 1 }, bairros: [] }
    expect((await PUT(new NextRequest('http://localhost/x', { method: 'PUT', body: JSON.stringify(tabela) }))).status).toBe(403)
    logarComo(dono)
    const ok = await PUT(new NextRequest('http://localhost/x', { method: 'PUT', body: JSON.stringify({ ...tabela,
      bairros: [{ nome: 'Centro', valor: 7 }, { nome: 'centro ', valor: 8 }] }) }))
    expect(ok.status).toBe(400)
  })
})
