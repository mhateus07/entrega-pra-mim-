import type { StatusPedido } from '@prisma/client'
import type { AuthenticatedUser } from './auth-helpers'

export function podeAlterarPedido(
  user: AuthenticatedUser,
  pedido: { clienteId: string; motoboyId: string | null; status: StatusPedido },
  status: StatusPedido,
  motoboyId?: string,
): boolean {
  if (user.role === 'ADMIN') return true
  if (user.role === 'CLIENTE') {
    return !!user.clienteId && user.clienteId === pedido.clienteId && status === 'CANCELADO'
  }
  if (user.role !== 'MOTOBOY' || !user.motoboyId) return false
  if (status === 'ACEITO') {
    return pedido.status === 'SOLICITADO' && pedido.motoboyId === null &&
      (!motoboyId || motoboyId === user.motoboyId)
  }
  return pedido.motoboyId === user.motoboyId
}

export function podeGerenciarPagamento(
  user: AuthenticatedUser,
  pagamento: { clienteId: string },
): boolean {
  return user.role === 'ADMIN' || (user.role === 'CLIENTE' &&
    !!user.clienteId && user.clienteId === pagamento.clienteId)
}

export function podeConfirmarDinheiro(
  user: AuthenticatedUser,
  motoboyId: string | null,
): boolean {
  return user.role === 'ADMIN' || (user.role === 'MOTOBOY' &&
    !!user.motoboyId && user.motoboyId === motoboyId)
}
