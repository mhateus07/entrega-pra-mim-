import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { isPublicApi } from '@/lib/public-api'

// Usa os helpers de autorização reais; só a sessão e o banco são simulados.
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  motoboyFind: vi.fn(), motoboyUpdateMany: vi.fn(), motoboyUpdate: vi.fn(),
  pedidoFindFirst: vi.fn(),
  idemCreate: vi.fn(), idemFind: vi.fn(), idemUpdate: vi.fn(), idemDeleteMany: vi.fn(),
  auditCreate: vi.fn(),
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.session, default: vi.fn() }))
vi.mock('@/lib/prisma', () => {
  const db = {
    motoboy: { findUnique: mocks.motoboyFind, updateMany: mocks.motoboyUpdateMany, update: mocks.motoboyUpdate },
    pedido: { findFirst: mocks.pedidoFindFirst },
    idempotencyKey: { create: mocks.idemCreate, findUnique: mocks.idemFind, update: mocks.idemUpdate, deleteMany: mocks.idemDeleteMany },
    auditLog: { create: mocks.auditCreate },
    $transaction: (fn: (tx: unknown) => unknown) => fn(db),
  }
  return { default: db }
})

type Papel = 'ADMIN' | 'CLIENTE' | 'MOTOBOY'
function logar(role: Papel, extra: { clienteId?: string; motoboyId?: string } = {}) {
  mocks.session.mockResolvedValue({ user: {
    id: `u-${role}-${extra.clienteId ?? extra.motoboyId ?? ''}`, email: 'x@test.local', role,
    clienteId: extra.clienteId ?? null, motoboyId: extra.motoboyId ?? null,
  } })
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auditCreate.mockResolvedValue({})
  mocks.motoboyFind.mockResolvedValue({ id: 'm1', latitudeAtual: -21.7, longitudeAtual: -43.3, status: 'EM_ENTREGA', aprovacao: 'APROVADO' })
})
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('GET /api/motoboys/[id]/localizacao', () => {
  const chamar = async (id = 'm1') => {
    const { GET } = await import('@/app/api/motoboys/[id]/localizacao/route')
    return GET(new NextRequest(`http://x/api/motoboys/${id}/localizacao`), ctx(id))
  }

  it('nega cliente sem entrega ativa com o motoboy', async () => {
    logar('CLIENTE', { clienteId: 'c-sem-vinculo' })
    mocks.pedidoFindFirst.mockResolvedValue(null)
    expect((await chamar()).status).toBe(403)
    expect(mocks.motoboyFind).not.toHaveBeenCalled()
    expect(mocks.pedidoFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ motoboyId: 'm1', clienteId: 'c-sem-vinculo' }),
    }))
  })

  it('nega outro motoboy', async () => {
    logar('MOTOBOY', { motoboyId: 'm2' })
    expect((await chamar()).status).toBe(403)
    expect(mocks.motoboyFind).not.toHaveBeenCalled()
  })

  it('permite cliente com entrega em andamento, o próprio motoboy e o admin', async () => {
    logar('CLIENTE', { clienteId: 'c1' })
    mocks.pedidoFindFirst.mockResolvedValue({ clienteId: 'c1', motoboyId: 'm1' })
    expect((await chamar()).status).toBe(200)
    logar('MOTOBOY', { motoboyId: 'm1' })
    expect((await chamar()).status).toBe(200)
    logar('ADMIN')
    expect((await chamar()).status).toBe(200)
  })

  it('exige login', async () => {
    mocks.session.mockResolvedValue(null)
    expect((await chamar()).status).toBe(401)
  })
})

describe('aprovação de motoboy', () => {
  it('motoboy pendente não envia localização', async () => {
    logar('MOTOBOY', { motoboyId: 'm1' })
    mocks.motoboyUpdateMany.mockResolvedValue({ count: 0 })
    const { POST } = await import('@/app/api/motoboys/[id]/localizacao/route')
    const res = await POST(new NextRequest('http://x/api/motoboys/m1/localizacao', {
      method: 'POST', body: JSON.stringify({ latitude: -21.7, longitude: -43.3 }),
    }), ctx('m1'))
    expect(res.status).toBe(403)
    expect(mocks.motoboyUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'm1', aprovacao: 'APROVADO' },
    }))
  })

  it('só admin aprova e reprovação exige motivo', async () => {
    const { PATCH } = await import('@/app/api/motoboys/[id]/aprovacao/route')
    const req = (body: unknown) => new NextRequest('http://x/api/motoboys/m1/aprovacao', { method: 'PATCH', body: JSON.stringify(body) })

    logar('MOTOBOY', { motoboyId: 'm1' })
    expect((await PATCH(req({ aprovacao: 'APROVADO' }), ctx('m1'))).status).toBe(403)

    logar('ADMIN')
    expect((await PATCH(req({ aprovacao: 'REPROVADO' }), ctx('m1'))).status).toBe(400)

    mocks.motoboyFind.mockResolvedValue({ aprovacao: 'PENDENTE_APROVACAO' })
    mocks.motoboyUpdate.mockResolvedValue({ id: 'm1', aprovacao: 'APROVADO', status: 'OFFLINE' })
    expect((await PATCH(req({ aprovacao: 'APROVADO' }), ctx('m1'))).status).toBe(200)
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      acao: 'motoboy.aprovacao', entidadeId: 'm1',
      dados: { de: 'PENDENTE_APROVACAO', para: 'APROVADO' },
    }) })
  })

  it('suspensão é recusada com entrega em andamento', async () => {
    logar('ADMIN')
    mocks.motoboyFind.mockResolvedValue({ aprovacao: 'APROVADO' })
    mocks.pedidoFindFirst.mockResolvedValue({ id: 'p1' })
    const { PATCH } = await import('@/app/api/motoboys/[id]/aprovacao/route')
    const res = await PATCH(new NextRequest('http://x/api/motoboys/m1/aprovacao', {
      method: 'PATCH', body: JSON.stringify({ aprovacao: 'SUSPENSO', motivo: 'Documento vencido' }),
    }), ctx('m1'))
    expect(res.status).toBe(409)
    expect(mocks.motoboyUpdate).not.toHaveBeenCalled()
  })
})

describe('idempotência', () => {
  const req = (chave?: string) => new Request('http://x/api/pedidos', {
    method: 'POST', headers: chave ? { 'Idempotency-Key': chave } : {},
  })
  const p2002 = () => new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })

  it('sem header executa normalmente sem tocar no banco', async () => {
    const { comIdempotencia } = await import('@/lib/idempotency')
    const executar = vi.fn(async () => NextResponse.json({ ok: true }, { status: 201 }))
    expect((await comIdempotencia(req(), 'u1', 'teste', {}, executar)).status).toBe(201)
    expect(executar).toHaveBeenCalledOnce()
    expect(mocks.idemCreate).not.toHaveBeenCalled()
  })

  it('primeira chamada executa e guarda a resposta', async () => {
    const { comIdempotencia } = await import('@/lib/idempotency')
    mocks.idemCreate.mockResolvedValue({ id: 'k1' })
    const executar = vi.fn(async () => NextResponse.json({ id: 'pedido-1' }, { status: 201 }))
    const res = await comIdempotencia(req('chave-12345'), 'u1', 'teste', { a: 1 }, executar)
    expect(res.status).toBe(201)
    expect(mocks.idemUpdate).toHaveBeenCalledWith({ where: { id: 'k1' }, data: { statusCode: 201, resposta: '{"id":"pedido-1"}' } })
  })

  it('repetição devolve a resposta guardada sem executar de novo', async () => {
    const { comIdempotencia } = await import('@/lib/idempotency')
    mocks.idemCreate.mockRejectedValue(p2002())
    const { createHash } = await import('crypto')
    mocks.idemFind.mockResolvedValue({
      id: 'k1', createdAt: new Date(), statusCode: 201, resposta: '{"id":"pedido-1"}',
      requestHash: createHash('sha256').update(JSON.stringify({ a: 1 })).digest('hex'),
    })
    const executar = vi.fn()
    const res = await comIdempotencia(req('chave-12345'), 'u1', 'teste', { a: 1 }, executar)
    expect(res.status).toBe(201)
    expect(res.headers.get('Idempotent-Replayed')).toBe('true')
    expect(await res.json()).toEqual({ id: 'pedido-1' })
    expect(executar).not.toHaveBeenCalled()
  })

  it('mesma chave com outro corpo é rejeitada; em processamento retorna 409', async () => {
    const { comIdempotencia } = await import('@/lib/idempotency')
    mocks.idemCreate.mockRejectedValue(p2002())
    mocks.idemFind.mockResolvedValue({ id: 'k1', createdAt: new Date(), statusCode: null, resposta: null, requestHash: 'outro' })
    expect((await comIdempotencia(req('chave-12345'), 'u1', 'teste', { a: 1 }, vi.fn())).status).toBe(422)
    const { createHash } = await import('crypto')
    mocks.idemFind.mockResolvedValue({ id: 'k1', createdAt: new Date(), statusCode: null, resposta: null,
      requestHash: createHash('sha256').update(JSON.stringify({ a: 1 })).digest('hex') })
    expect((await comIdempotencia(req('chave-12345'), 'u1', 'teste', { a: 1 }, vi.fn())).status).toBe(409)
  })

  it('erro 5xx libera a chave para nova tentativa', async () => {
    const { comIdempotencia } = await import('@/lib/idempotency')
    mocks.idemCreate.mockResolvedValue({ id: 'k1' })
    await comIdempotencia(req('chave-12345'), 'u1', 'teste', {}, async () => NextResponse.json({}, { status: 500 }))
    expect(mocks.idemDeleteMany).toHaveBeenCalledWith({ where: { id: 'k1' } })
    expect(mocks.idemUpdate).not.toHaveBeenCalled()
  })

  it('rejeita chave malformada', async () => {
    const { comIdempotencia } = await import('@/lib/idempotency')
    expect((await comIdempotencia(req('curta'), 'u1', 'teste', {}, vi.fn())).status).toBe(400)
  })
})

describe('auditoria', () => {
  it('falha ao gravar não interrompe a operação', async () => {
    mocks.auditCreate.mockRejectedValue(new Error('banco fora'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { registrarAuditoria } = await import('@/lib/audit')
    await expect(registrarAuditoria({ acao: 'pedido.criado', entidade: 'Pedido' })).resolves.toBeUndefined()
    spy.mockRestore()
  })
})

describe('boot e health', () => {
  it('healthchecks são públicos apenas via GET', () => {
    expect(isPublicApi('GET', '/api/health/live')).toBe(true)
    expect(isPublicApi('GET', '/api/health/ready')).toBe(true)
    expect(isPublicApi('POST', '/api/health/ready')).toBe(false)
  })

  it('live responde 200 sem depender do banco', async () => {
    const { GET } = await import('@/app/api/health/live/route')
    expect(GET().status).toBe(200)
  })

  it('assertEnv bloqueia produção sem variáveis ou com segredo curto', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', 'mysql://app:forte@db:3306/app')
    vi.stubEnv('NEXTAUTH_URL', 'https://exemplo.com')
    vi.stubEnv('NEXTAUTH_SECRET', 'curto')
    const { assertEnv } = await import('@/lib/env')
    expect(() => assertEnv()).toThrow(/NEXTAUTH_SECRET/)
    vi.stubEnv('NEXTAUTH_SECRET', 'a'.repeat(44))
    expect(() => assertEnv()).not.toThrow()
    vi.stubEnv('DATABASE_URL', '')
    expect(() => assertEnv()).toThrow(/DATABASE_URL/)
    spy.mockRestore(); warn.mockRestore()
  })
})
