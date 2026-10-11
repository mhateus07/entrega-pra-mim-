import { cn } from '@/utils/cn'

/** Anel de contagem regressiva da oferta (90 s): esvazia e fica vermelho no fim. */
export default function ContagemOferta({ segundos, total = 90, className }: { segundos: number; total?: number; className?: string }) {
  const fracao = Math.max(0, Math.min(1, segundos / total))
  const urgente = segundos <= 15
  return (
    <span className={cn('relative inline-flex h-12 w-12 shrink-0 items-center justify-center', className)} role="timer" aria-label={`${segundos} segundos para aceitar`}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surface-3)" strokeWidth="5" />
        <circle cx="24" cy="24" r="20" fill="none" stroke={urgente ? 'var(--danger)' : 'var(--brand-mark)'} strokeWidth="5" strokeLinecap="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset={1 - fracao} style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
      </svg>
      <span className={cn('font-mono text-sm font-medium tabular', urgente ? 'text-danger' : 'text-fg')}>{segundos}</span>
    </span>
  )
}
