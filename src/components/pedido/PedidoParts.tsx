import { Check, Star } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatarDataHora } from '@/utils/helpers'

interface Endereco {
  logradouro: string
  numero: string
  complemento?: string | null
  bairro: string
  cidade: string
  estado: string
}

export function RotaEnderecos({ origem, destino, className }: { origem: Endereco; destino: Endereco; className?: string }) {
  const linha = (e: Endereco) => (
    <>
      <p className="text-sm font-medium text-fg">{e.logradouro}, {e.numero}</p>
      {e.complemento && <p className="text-[13px] text-fg-3">{e.complemento}</p>}
      <p className="text-[13px] text-fg-3">{e.bairro} · {e.cidade}/{e.estado}</p>
    </>
  )
  return (
    <ol className={cn('relative', className)}>
      <li className="relative flex gap-3 pb-5">
        <span className="absolute left-[7px] top-5 bottom-0 w-px bg-line-strong" aria-hidden="true" />
        <span className="mt-1 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-2 border-fg bg-surface" aria-hidden="true" />
        <div className="min-w-0">
          <p className="mb-0.5 text-xs font-medium text-fg-3">Coleta</p>
          {linha(origem)}
        </div>
      </li>
      <li className="flex gap-3">
        <span className="mt-1 h-[15px] w-[15px] shrink-0 rounded-full bg-brand ring-4 ring-brand-soft" aria-hidden="true" />
        <div className="min-w-0">
          <p className="mb-0.5 text-xs font-medium text-fg-3">Entrega</p>
          {linha(destino)}
        </div>
      </li>
    </ol>
  )
}

interface Marcos {
  createdAt: string
  aceitoEm?: string | null
  coletadoEm?: string | null
  entregueEm?: string | null
  canceladoEm?: string | null
}

export function LinhaDoTempo({ pedido, compact }: { pedido: Marcos; compact?: boolean }) {
  const etapas = pedido.canceladoEm
    ? [
        { label: 'Pedido criado', at: pedido.createdAt },
        ...(pedido.aceitoEm ? [{ label: 'Aceito pelo entregador', at: pedido.aceitoEm }] : []),
        { label: 'Cancelado', at: pedido.canceladoEm, cancel: true },
      ]
    : [
        { label: 'Pedido criado', at: pedido.createdAt },
        { label: 'Aceito pelo entregador', at: pedido.aceitoEm },
        { label: 'Coletado', at: pedido.coletadoEm },
        { label: 'Entregue', at: pedido.entregueEm },
      ]
  const atual = etapas.findIndex((e) => !e.at)

  return (
    <ol className={cn('space-y-0', compact && 'text-[13px]')}>
      {etapas.map((e, i) => {
        const feito = !!e.at
        const isCancel = 'cancel' in e && e.cancel
        return (
          <li key={e.label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < etapas.length - 1 && (
              <span className={cn('absolute left-[9px] top-6 bottom-0 w-px', feito && etapas[i + 1].at ? 'bg-fg' : 'bg-line-strong')} aria-hidden="true" />
            )}
            <span
              className={cn(
                'mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border',
                isCancel ? 'border-danger bg-danger text-white' : feito ? 'border-fg bg-fg text-page' : i === atual ? 'border-brand bg-surface' : 'border-line-strong bg-surface'
              )}
              aria-hidden="true"
            >
              {feito && !isCancel && <Check className="h-3 w-3" strokeWidth={3} />}
              {i === atual && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
            </span>
            <div className="min-w-0">
              <p className={cn('text-sm', feito ? 'font-medium text-fg' : i === atual ? 'font-medium text-fg' : 'text-fg-3')}>{e.label}</p>
              <p className="text-xs tabular text-fg-3">{e.at ? formatarDataHora(e.at) : i === atual ? 'Em andamento' : 'Pendente'}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function Estrelas({ nota, className }: { nota: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('h-4 w-4', n <= nota ? 'fill-current text-chart-4' : 'text-line-strong')} aria-hidden="true" />
      ))}
    </span>
  )
}
