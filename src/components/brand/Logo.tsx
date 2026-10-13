import { cn } from '@/utils/cn'

/**
 * Marca Entrega Pra Mim, versão "Chegada" (ver brand/README.md).
 * Símbolo: a rota (barra horizontal) que termina na porta do cliente (barra vertical laranja).
 * Logotipo: Host Grotesk 600, espaçamento fechado. A tinta segue `currentColor`.
 */
export function LogoMark({ className, variant = 'linha' }: { className?: string; variant?: 'linha' | 'icone' }) {
  if (variant === 'icone') {
    // Ícone de app: quadrado reto em asfalto, para fundos variados (rastreio, avatar)
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true" className={cn('h-8 w-8 shrink-0', className)}>
        <rect width="40" height="40" rx="6" fill="#121314" />
        <rect x="7" y="17" width="17" height="6" fill="#f7f7f5" />
        <rect x="27" y="10" width="6" height="20" fill="#f0712b" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn('h-6 w-6 shrink-0', className)}>
      <rect x="2" y="16" width="25" height="8" fill="currentColor" />
      <rect x="31" y="7" width="7" height="26" fill="var(--brand-mark)" />
    </svg>
  )
}

export function LogoWordmark({ className }: { className?: string }) {
  return <span className={cn('whitespace-nowrap text-[18px] font-semibold leading-none tracking-[-0.035em]', className)}>Entrega Pra Mim</span>
}

export default function Logo({ className, markClassName, hideText }: { className?: string; markClassName?: string; hideText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-fg', className)} role="img" aria-label="Entrega Pra Mim">
      <LogoMark className={markClassName} />
      {!hideText && <LogoWordmark />}
    </span>
  )
}
