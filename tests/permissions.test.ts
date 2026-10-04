import { describe, expect, it, vi, afterEach } from 'vitest'
import type { AuthenticatedUser } from '@/lib/auth-helpers'
import { podeAlterarPedido, podeConfirmarDinheiro, podeGerenciarPagamento } from '@/lib/pedido-permissions'

const cliente: AuthenticatedUser = { id: 'u1', email: 'c@test.local', role: 'CLIENTE', clienteId: 'c1', motoboyId: null }
const motoboy: AuthenticatedUser = { id: 'u2', email: 'm@test.local', role: 'MOTOBOY', clienteId: null, motoboyId: 'm1' }
const pedido = { clienteId: 'c1', motoboyId: null, status: 'SOLICITADO' as const }

describe('permissões por operação', () => {
  it('permite aceitar pedido livre somente para o próprio motoboy', () => {
    expect(podeAlterarPedido(motoboy, pedido, 'ACEITO', 'm1')).toBe(true)
    expect(podeAlterarPedido(motoboy, pedido, 'ACEITO', 'm2')).toBe(false)
    expect(podeAlterarPedido(motoboy, { ...pedido, motoboyId: 'm2' }, 'ACEITO', 'm1')).toBe(false)
  })
  it('cliente pode cancelar o próprio pedido, mas não operá-lo ou cancelar de outro cliente', () => {
    expect(podeAlterarPedido(cliente, pedido, 'CANCELADO')).toBe(true)
    expect(podeAlterarPedido(cliente, pedido, 'ACEITO', 'm1')).toBe(false)
    expect(podeAlterarPedido(cliente, pedido, 'ENTREGUE')).toBe(false)
    expect(podeAlterarPedido(cliente, { ...pedido, clienteId: 'c2' }, 'CANCELADO')).toBe(false)
  })
  it('nega pagamentos de terceiros e confirmação por motoboy não atribuído', () => {
    expect(podeGerenciarPagamento(cliente, { clienteId: 'c2' })).toBe(false)
    expect(podeGerenciarPagamento(cliente, { clienteId: 'c1' })).toBe(true)
    expect(podeConfirmarDinheiro(motoboy, 'm2')).toBe(false)
    expect(podeConfirmarDinheiro(motoboy, 'm1')).toBe(true)
    expect(podeConfirmarDinheiro(cliente, 'm1')).toBe(false)
    expect(podeConfirmarDinheiro({ ...motoboy, motoboyId: null }, null)).toBe(false)
  })
})

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
it('bloqueia simulação de cobrança eletrônica em produção', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.resetModules()
  const { ELECTRONIC_PAYMENTS_AVAILABLE } = await import('@/lib/payment-policy')
  expect(ELECTRONIC_PAYMENTS_AVAILABLE).toBe(false)
})
