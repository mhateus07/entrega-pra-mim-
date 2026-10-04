import { cn } from '@/utils/cn'
import { CORES_STATUS_PEDIDO, CORES_STATUS_MOTOBOY, LABELS_STATUS_PEDIDO, LABELS_STATUS_MOTOBOY } from '@/utils/helpers'
import { CORES_STATUS_PAGAMENTO, LABELS_STATUS_PAGAMENTO } from '@/lib/pagamentos'
import type { StatusPedido, StatusMotoboy, StatusPagamento } from '@prisma/client'

const base = 'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium'

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
}

export function PedidoStatusBadge({ status, className }: { status: StatusPedido; className?: string }) {
  return <span className={cn(base, CORES_STATUS_PEDIDO[status], className)}><Dot />{LABELS_STATUS_PEDIDO[status]}</span>
}

export function MotoboyStatusBadge({ status, className }: { status: StatusMotoboy; className?: string }) {
  return <span className={cn(base, CORES_STATUS_MOTOBOY[status], className)}><Dot />{LABELS_STATUS_MOTOBOY[status]}</span>
}

export function PagamentoStatusBadge({ status, className }: { status: StatusPagamento; className?: string }) {
  return <span className={cn(base, CORES_STATUS_PAGAMENTO[status], className)}><Dot />{LABELS_STATUS_PAGAMENTO[status]}</span>
}
