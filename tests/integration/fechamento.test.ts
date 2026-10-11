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
  sessao.atual = { user: { id: user.id, email: user.email, name: 'T', superadmin: false, activeOrganizationId: user.organizationId,
    orgRole: user.orgRole, orgStatus: 'ATIVA', motoboyId: user.motoboyId, clienteId: user.clienteId } }
}

;(url ? describe : describe.skip)('MySQL: fechamento', () => {
  let db: PrismaClient
  let orgA: string, orgB: string
  let dono: OrgUser, cliente: OrgUser, motoboy: OrgUser

  async function entregue(org: string, cli: OrgUser, mot: OrgUser, entregueEm: string, valor: number, dinheiro = false) {
    const end = await db.endereco.create({ data: { organizationId: org, clienteId: cli.clienteId!, cep: '36000000', logradouro: 'R', numero: '1', bairro: 'B', cidade: 'JF', estado: 'MG' } })
    await db.pedido.create({ data: { organizationId: org, clienteId: cli.clienteId!, motoboyId: mot.motoboyId, enderecoOrigemId: end.id, enderecoDestinoId: end.id,
      tipoServico: 'EXPRESSA', status: 'ENTREGUE', entregueEm: new Date(entregueEm), distanciaKm: 2, duracaoEstimada: 10, valorBase: valor, multiplicador: 1, valorTotal: valor,
      ...(dinheiro ? { pagamento: { create: { organizationId: org, clienteId: cli.clienteId!, valor, metodo: 'DINHEIRO', status: 'APROVADO' } } } : {}) } })
  }
  const chamar = async (query: string) => (await import('@/app/api/fechamento/route')).GET(new NextRequest(`http://localhost/api/fechamento?${query}`))

  beforeAll(async () => {
    process.env.DATABASE_URL = url!
    db = (await import('@/lib/prisma')).default
    orgA = (await criarOrg(db, 'A')).id
    orgB = (await criarOrg(db, 'B')).id
    dono = await criarUsuario(db, orgA, 'OWNER')
    cliente = await criarUsuario(db, orgA, 'CLIENT')
    motoboy = await criarUsuario(db, orgA, 'DRIVER')
    // 10/10 às 23h30 em Brasília = 11/10 02:30 UTC: conta no dia 10
    await entregue(orgA, cliente, motoboy, '2026-10-11T02:30:00Z', 40, true)
    await entregue(orgA, cliente, motoboy, '2026-10-10T15:00:00Z', 10)
    await entregue(orgA, cliente, motoboy, '2026-10-11T15:00:00Z', 999) // fora do período
    const clienteB = await criarUsuario(db, orgB, 'CLIENT')
    const motoboyB = await criarUsuario(db, orgB, 'DRIVER')
    await entregue(orgB, clienteB, motoboyB, '2026-10-10T15:00:00Z', 555)
  })

  afterAll(async () => {
    if (!db) return
    if (orgA) await removerOrg(db, orgA)
    if (orgB) await removerOrg(db, orgB)
    await db.$disconnect()
  })

  it('por motoboy: só o período (no fuso da central) e só a central ativa, com repasse de 70%', async () => {
    logarComo(dono)
    const body = await (await chamar('de=2026-10-10&ate=2026-10-10&visao=motoboy')).json()
    expect(body.data.linhas).toEqual([expect.objectContaining({
      motoboyId: motoboy.motoboyId, corridas: 2, valorCorridas: 50, repasse: 35, dinheiroRecebido: 40, saldoAcerto: -5,
    })])
  })

  it('por cliente e exportação CSV', async () => {
    logarComo(dono)
    const body = await (await chamar('de=2026-10-10&ate=2026-10-10&visao=cliente')).json()
    expect(body.data.linhas).toEqual([expect.objectContaining({ corridas: 2, valorTotal: 50, pago: 40, aCobrar: 10 })])
    const csv = await chamar('de=2026-10-10&ate=2026-10-10&visao=cliente&formato=csv')
    expect(csv.headers.get('content-type')).toContain('text/csv')
    expect(csv.headers.get('content-disposition')).toContain('fechamento-clientes-2026-10-10_2026-10-10.csv')
    expect(await csv.text()).toContain(';50,00;40,00;10,00')
  })

  it('não movimenta saldo e é só da gestão; período inválido é recusado', async () => {
    expect(await db.transacaoMotoboy.count({ where: { organizationId: orgA } })).toBe(0)
    logarComo(cliente)
    expect((await chamar('de=2026-10-10&ate=2026-10-10')).status).toBe(403)
    logarComo(dono)
    expect((await chamar('de=2026-10-11&ate=2026-10-10')).status).toBe(400)
    expect((await chamar('de=ontem&ate=hoje')).status).toBe(400)
  })
})
