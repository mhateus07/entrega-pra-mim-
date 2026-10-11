import type { StatusPedido } from '@prisma/client'
import { isGestor, type OrgUser } from './auth-helpers'

// Regras por operação, sempre para um pedido já confirmado como da mesma
// organização do usuário (ver requirePedidoAccess / alterarStatusPedido).

export function podeAlterarPedido(
  user: OrgUser,
  pedido: { clienteId: string; motoboyId: string | null; status: StatusPedido },
  status: StatusPedido,
): boolean {
  if (isGestor(user)) return true
  if (user.orgRole === 'CLIENT') {
    return !!user.clienteId && user.clienteId === pedido.clienteId && status === 'CANCELADO'
  }
  if (user.orgRole !== 'DRIVER' || !user.motoboyId) return false
  // O motoboy assume corridas só aceitando uma oferta do despacho (src/lib/despacho.ts)
  if (status === 'ACEITO') return false
  return pedido.motoboyId === user.motoboyId
}

export function podeGerenciarPagamento(
  user: OrgUser,
  pagamento: { clienteId: string },
): boolean {
  return isGestor(user) || (user.orgRole === 'CLIENT' &&
    !!user.clienteId && user.clienteId === pagamento.clienteId)
}

export function podeConfirmarDinheiro(
  user: OrgUser,
  motoboyId: string | null,
): boolean {
  return isGestor(user) || (user.orgRole === 'DRIVER' &&
    !!user.motoboyId && user.motoboyId === motoboyId)
}
