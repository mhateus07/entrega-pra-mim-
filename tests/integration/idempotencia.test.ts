import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

const testUrl = process.env.TEST_DATABASE_URL
if (testUrl && !new URL(testUrl).pathname.endsWith('/entrega_test')) {
  throw new Error('TEST_DATABASE_URL deve apontar para o banco descartável entrega_test')
}
const suite = testUrl ? describe : describe.skip

suite('MySQL: idempotência e auditoria', () => {
  let db: PrismaClient
  let comIdempotencia: typeof import('@/lib/idempotency').comIdempotencia
  let registrarAuditoria: typeof import('@/lib/audit').registrarAuditoria
  const userId = `teste-${randomUUID()}`

  beforeAll(async () => {
    process.env.DATABASE_URL = testUrl!
    db = (await import('@/lib/prisma')).default
    ;({ comIdempotencia } = await import('@/lib/idempotency'))
    ;({ registrarAuditoria } = await import('@/lib/audit'))
  })

  afterAll(async () => {
    await db.idempotencyKey.deleteMany({ where: { userId } })
    await db.auditLog.deleteMany({ where: { userId } })
  })

  const req = (chave: string) => new Request('http://x/api/pedidos', { method: 'POST', headers: { 'Idempotency-Key': chave } })

  it('requisições simultâneas com a mesma chave executam a operação uma única vez', async () => {
    const chave = randomUUID()
    let execucoes = 0
    const executar = async () => {
      execucoes++
      await new Promise(resolve => setTimeout(resolve, 50))
      return NextResponse.json({ id: 'pedido-unico' }, { status: 201 })
    }
    const respostas = await Promise.all(Array.from({ length: 5 }, () =>
      comIdempotencia(req(chave), userId, 'pedidos:criar', { a: 1 }, executar)))
    expect(execucoes).toBe(1)
    expect(respostas.map(r => r.status).sort()).toEqual([201, 409, 409, 409, 409])

    const repeticao = await comIdempotencia(req(chave), userId, 'pedidos:criar', { a: 1 }, vi.fn())
    expect(repeticao.status).toBe(201)
    expect(await repeticao.json()).toEqual({ id: 'pedido-unico' })
  })

  it('a mesma chave em outro escopo é independente', async () => {
    const chave = randomUUID()
    const executar = vi.fn(async () => NextResponse.json({}, { status: 200 }))
    await comIdempotencia(req(chave), userId, 'pedidos:criar', {}, executar)
    await comIdempotencia(req(chave), userId, 'pagamentos:criar', {}, executar)
    expect(executar).toHaveBeenCalledTimes(2)
  })

  it('grava auditoria com dados JSON', async () => {
    await registrarAuditoria({ acao: 'pedido.criado', entidade: 'Pedido', entidadeId: 'p1', userId, dados: { valor: '12.50' } })
    const log = await db.auditLog.findFirst({ where: { userId } })
    expect(log).toMatchObject({ acao: 'pedido.criado', entidade: 'Pedido', entidadeId: 'p1', dados: { valor: '12.50' } })
  })
})
