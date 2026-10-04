import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { isPublicApi } from '@/lib/public-api'

const mocks = vi.hoisted(() => ({ pedidoAccess: vi.fn(), pedidoFind: vi.fn() }))
vi.mock('@/lib/auth-helpers', () => ({ requirePedidoAccess: mocks.pedidoAccess }))
vi.mock('@/lib/prisma', () => ({ default: { pedido: { findUnique: mocks.pedidoFind } } }))

beforeEach(() => vi.clearAllMocks())

describe('rate limit', () => {
  it('bloqueia após o limite na janela (fallback em memória)', async () => {
    const config = { limit: 2, windowMs: 60_000 }
    const key = `teste:${Math.random()}`
    expect((await checkRateLimit(key, config)).success).toBe(true)
    expect((await checkRateLimit(key, config)).success).toBe(true)
    const bloqueado = await checkRateLimit(key, config)
    expect(bloqueado.success).toBe(false)
    expect(bloqueado.remaining).toBe(0)
  })

  it('não confia no primeiro IP do X-Forwarded-For', () => {
    const req = (headers: Record<string, string>) => new Request('http://x', { headers })
    expect(getClientIP(req({ 'x-real-ip': '10.0.0.1', 'x-forwarded-for': '1.1.1.1' }))).toBe('10.0.0.1')
    expect(getClientIP(req({ 'x-forwarded-for': '6.6.6.6, 10.0.0.2' }))).toBe('10.0.0.2')
    expect(getClientIP(req({}))).toBe('unknown')
  })
})

describe('APIs públicas', () => {
  it('libera só NextAuth e cadastro', () => {
    expect(isPublicApi('POST', '/api/auth/callback/credentials')).toBe(true)
    expect(isPublicApi('GET', '/api/auth/session')).toBe(true)
    expect(isPublicApi('POST', '/api/clientes')).toBe(true)
    expect(isPublicApi('POST', '/api/motoboys')).toBe(true)
    expect(isPublicApi('GET', '/api/clientes')).toBe(false)
    expect(isPublicApi('GET', '/api/pedidos/p1/rastreamento')).toBe(false)
    expect(isPublicApi('POST', '/api/rotas')).toBe(false)
    expect(isPublicApi('GET', '/api/authx')).toBe(false)
  })
})

describe('GET /api/pedidos/[id]/rastreamento', () => {
  it('nega quem não tem acesso ao pedido', async () => {
    mocks.pedidoFind.mockResolvedValue({ id: 'p1', clienteId: 'c1', motoboyId: 'm1', status: 'EM_ENTREGA' })
    mocks.pedidoAccess.mockResolvedValue({
      authenticated: false, response: NextResponse.json({ success: false }, { status: 403 }),
    })
    const { GET } = await import('@/app/api/pedidos/[id]/rastreamento/route')
    const res = await GET(new NextRequest('http://x/api/pedidos/p1/rastreamento'), { params: Promise.resolve({ id: 'p1' }) })
    expect(res.status).toBe(403)
    expect(mocks.pedidoAccess).toHaveBeenCalledWith(expect.objectContaining({ clienteId: 'c1', motoboyId: 'm1' }))
  })
})
