import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type { AuthenticatedUser } from '@/lib/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

const auth = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/auth-helpers', () => ({
  requireAuth: auth.get,
  forbidden: (error: string) => NextResponse.json({ error }, { status: 403 }),
  serverError: (error: string) => NextResponse.json({ error }, { status: 500 }),
}))
const url = process.env.TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('/entrega_test')) throw new Error('Use o banco descartável entrega_test')

;(url ? describe : describe.skip)('MySQL: páginas com filtros e isolamento por cliente', () => {
  let db: PrismaClient
  let getOrders: typeof import('@/app/api/pedidos/route').GET
  const userIds: string[] = []
  const clientIds: string[] = []
  let owner: AuthenticatedUser
  beforeAll(async () => {
    process.env.DATABASE_URL = url!
    db = (await import('@/lib/prisma')).default
    getOrders = (await import('@/app/api/pedidos/route')).GET
    for (let customer = 0; customer < 2; customer++) {
      const user = await db.user.create({ data: { email: `${randomUUID()}@pagination.test`, nome: 'Teste paginação',
        senha: 'fixture', role: 'CLIENTE', cliente: { create: {} } }, include: { cliente: true } })
      userIds.push(user.id)
      clientIds.push(user.cliente!.id)
      if (customer === 0) owner = { id: user.id, email: user.email, role: 'CLIENTE', clienteId: user.cliente!.id, motoboyId: null }
      const address = await db.endereco.create({ data: { clienteId: user.cliente!.id, cep: '36000000',
        logradouro: 'Rua teste', numero: '1', bairro: 'Centro', cidade: 'Juiz de Fora', estado: 'MG' } })
      await db.pedido.createMany({ data: Array.from({ length: customer === 0 ? 25 : 3 }, (_, i) => ({
        clienteId: user.cliente!.id, enderecoOrigemId: address.id, enderecoDestinoId: address.id,
        status: i < 5 ? 'ENTREGUE' as const : 'SOLICITADO' as const, tipoServico: 'EXPRESSA' as const,
        distanciaKm: 1, duracaoEstimada: 10, valorBase: '0.10', multiplicador: 1, valorTotal: '0.30',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      })) })
    }
    auth.get.mockImplementation(async () => ({ authenticated: true, user: owner }))
  })
  async function list(query: string) {
    const response = await getOrders(new NextRequest(`http://localhost/api/pedidos?${query}`))
    expect(response.status).toBe(200)
    return response.json()
  }
  it('duas páginas não se repetem, preservam números e não incluem outros clientes', async () => {
    const first = await list('page=1&limit=20')
    const second = await list('page=2&limit=20')
    expect(first.pagination).toMatchObject({ total: 25, totalPages: 2 })
    expect(first.data).toHaveLength(20)
    expect(second.data).toHaveLength(5)
    const rows = [...first.data, ...second.data]
    expect(new Set(rows.map(p => p.id)).size).toBe(25)
    expect(rows.every(p => p.clienteId === owner.clienteId && p.valorTotal === 0.3)).toBe(true)
  })
  it('filtro é aplicado antes da paginação e contagem', async () => {
    const page = await list('status=ENTREGUE&limit=2&page=2')
    expect(page.pagination).toMatchObject({ total: 5, totalPages: 3 })
    expect(page.data).toHaveLength(2)
    expect(page.data.every((p: { status: string }) => p.status === 'ENTREGUE')).toBe(true)
  })
  it('separa pedidos ativos de históricos e impede filtro por outro cliente', async () => {
    expect((await list('grupo=ativos')).pagination.total).toBe(20)
    expect((await list(`grupo=finalizados&clienteId=${clientIds[1]}`)).pagination.total).toBe(5)
  })
  it('não aceita limites que removam a paginação ou filtros inválidos', async () => {
    for (const query of ['limit=1000', 'page=-1', 'status=INVALIDO']) {
      expect((await getOrders(new NextRequest(`http://localhost/api/pedidos?${query}`))).status).toBe(400)
    }
  })
  it('armazena e soma centavos sem resíduos de ponto flutuante', async () => {
    const sum = await db.pedido.aggregate({ where: { clienteId: owner.clienteId! }, _sum: { valorTotal: true } })
    expect(sum._sum.valorTotal!.toFixed(2)).toBe('7.50')
  })
  afterAll(async () => {
    if (!db || !clientIds.length) return
    await db.pedido.deleteMany({ where: { clienteId: { in: clientIds } } })
    await db.endereco.deleteMany({ where: { clienteId: { in: clientIds } } })
    await db.user.deleteMany({ where: { id: { in: userIds } } })
    await db.$disconnect()
  })
})
