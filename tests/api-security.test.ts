import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import type { OrgUser } from '@/lib/auth-helpers'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), role: vi.fn(), paymentFind: vi.fn(), clientFind: vi.fn(), addressFind: vi.fn(),
  driverList: vi.fn(), driverCount: vi.fn(), driverGroups: vi.fn(), paymentList: vi.fn(), orderCreate: vi.fn(),
}))
vi.mock('@/lib/auth-helpers', () => ({
  requireAuth: mocks.auth, requireOrgAccess: mocks.role,
  isGestor: (u: { orgRole: string }) => u.orgRole === 'OWNER' || u.orgRole === 'DISPATCHER',
  applyMapsRateLimit: () => ({ success: true }),
  applyRateLimit: () => ({ success: true }),
  forbidden: (error: string) => NextResponse.json({ success: false, error }, { status: 403 }),
  notFound: (error: string) => NextResponse.json({ success: false, error }, { status: 404 }),
  badRequest: (error: string) => NextResponse.json({ success: false, error }, { status: 400 }),
  serverError: (error: string) => NextResponse.json({ success: false, error }, { status: 500 }),
}))
vi.mock('@/lib/prisma', () => ({ default: {
  pagamento: { findUnique: mocks.paymentFind, findFirst: mocks.paymentFind, findMany: mocks.paymentList },
  cliente: { findUnique: mocks.clientFind, findFirst: mocks.clientFind }, endereco: { findUnique: mocks.addressFind },
  motoboy: { findMany: mocks.driverList, count: mocks.driverCount, groupBy: mocks.driverGroups }, pedido: { create: mocks.orderCreate },
} }))
const cliente: OrgUser = { id: 'u1', orgRole: 'CLIENT', organizationId: 'org1', superadmin: false, clienteId: 'cjld2cjxh0000qzrmn831i7rn', motoboyId: null, email: 'c@test.local' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.driverCount.mockResolvedValue(0)
  mocks.driverGroups.mockResolvedValue([])
  mocks.auth.mockResolvedValue({ authenticated: true, user: cliente })
  mocks.role.mockImplementation(async (roles?: string[]) => {
    const auth = await mocks.auth()
    if (!auth.authenticated) return auth
    return !roles || roles.includes(auth.user.orgRole) ? auth : {
      authenticated: false, response: NextResponse.json({ success: false }, { status: 403 }),
    }
  })
})

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('rotas de pagamentos e pedidos', () => {
  it('GET pagamento nega outro cliente, permite proprietário e administrador', async () => {
    const { GET } = await import('@/app/api/pagamentos/[id]/route')
    mocks.paymentFind.mockResolvedValue({ id: 'p1', clienteId: 'outro-cliente' })
    const request = new NextRequest('http://localhost/api/pagamentos/p1')
    expect((await GET(request, { params: Promise.resolve({ id: 'p1' }) })).status).toBe(403)
    mocks.paymentFind.mockResolvedValue({ id: 'p1', clienteId: cliente.clienteId })
    expect((await GET(request, { params: Promise.resolve({ id: 'p1' }) })).status).toBe(200)
    mocks.auth.mockResolvedValue({ authenticated: true, user: { ...cliente, orgRole: 'OWNER' } })
    mocks.paymentFind.mockResolvedValue({ id: 'p1', clienteId: 'outro-cliente' })
    expect((await GET(request, { params: Promise.resolve({ id: 'p1' }) })).status).toBe(200)
  })
  it('produção rejeita cobrança simulada mesmo se enviada diretamente à API', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const { POST } = await import('@/app/api/pagamentos/route')
    const response = await POST(new NextRequest('http://localhost/api/pagamentos', {
      method: 'POST', body: JSON.stringify({ pedidoId: 'p1', metodo: 'PIX' }),
    }))
    expect(response.status).toBe(503)
  })
  it('GET pagamento sem sessão retorna 401 antes de consultar dados', async () => {
    const { GET } = await import('@/app/api/pagamentos/[id]/route')
    mocks.auth.mockResolvedValue({ authenticated: false, response: NextResponse.json({}, { status: 401 }) })
    expect((await GET(new NextRequest('http://localhost/api/pagamentos/p1'), { params: Promise.resolve({ id: 'p1' }) })).status).toBe(401)
    expect(mocks.paymentFind).not.toHaveBeenCalled()
  })
  it('listagem de pagamentos falha fechada para cliente sem perfil', async () => {
    const { GET } = await import('@/app/api/pagamentos/route')
    mocks.auth.mockResolvedValue({ authenticated: true, user: { ...cliente, clienteId: null } })
    expect((await GET(new NextRequest('http://localhost/api/pagamentos'))).status).toBe(403)
    expect(mocks.paymentList).not.toHaveBeenCalled()
  })
  it('motoboy não pode criar pedidos para um cliente', async () => {
    const { POST } = await import('@/app/api/pedidos/route')
    mocks.auth.mockResolvedValue({ authenticated: true, user: { ...cliente, orgRole: 'DRIVER' } })
    expect((await POST(new NextRequest('http://localhost/api/pedidos', { method: 'POST' }))).status).toBe(403)
    expect(mocks.orderCreate).not.toHaveBeenCalled()
  })
  it('pedido rejeita endereço de outro cliente', async () => {
    const { POST } = await import('@/app/api/pedidos/route')
    mocks.clientFind.mockResolvedValue({ id: cliente.clienteId })
    mocks.addressFind.mockResolvedValue({ clienteId: 'outro-cliente', latitude: -21, longitude: -43 })
    const response = await POST(new NextRequest('http://localhost/api/pedidos', { method: 'POST', body: JSON.stringify({
      clienteId: cliente.clienteId, enderecoOrigemId: 'cjld2cyuq0000t3rmniod1foy',
      enderecoDestinoId: 'cjld2cjxh0000qzrmn831i7rn', tipoServico: 'EXPRESSA',
    }) }))
    expect(response.status).toBe(403)
    expect(mocks.orderCreate).not.toHaveBeenCalled()
  })
  it('listagem de motoboys seleciona dados públicos sem CNH, placa ou GPS para clientes', async () => {
    const { GET } = await import('@/app/api/motoboys/route')
    mocks.driverList.mockResolvedValue([])
    expect((await GET(new NextRequest('http://localhost/api/motoboys'))).status).toBe(200)
    const query = mocks.driverList.mock.calls[0][0]
    expect(query.include).toBeUndefined()
    for (const field of ['cnh', 'veiculoPlaca', 'latitudeAtual', 'longitudeAtual', 'userId']) expect(query.select[field]).toBeUndefined()
    expect(query.select.user.select.email).toBeUndefined()
    expect(query.select.user.select.telefone).toBeUndefined()
  })
})
