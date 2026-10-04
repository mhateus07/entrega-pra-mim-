import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-fg-3', className)} aria-hidden="true" />
}

export function PageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-fg-3" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <PageLoader label={label} />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon?: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-2 text-fg-3">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-fg-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, description, actions, eyebrow }: {
  title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] text-fg-3">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string; size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" className={cn('inline-flex max-w-full overflow-x-auto scrollbar-none rounded-lg border border-line bg-surface-2 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'bg-surface text-fg shadow-xs' : 'text-fg-3 hover:text-fg'
            )}
          >
            {o.label}
            {typeof o.count === 'number' && <span className="tabular text-fg-3">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function DataRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2 text-sm', className)}>
      <span className="shrink-0 text-fg-3">{label}</span>
      <span className="min-w-0 text-right text-fg">{children}</span>
    </div>
  )
}

export function Alert({ variant = 'info', title, children, icon: Icon, className }: {
  variant?: 'info' | 'success' | 'warning' | 'danger'; title?: ReactNode; children?: ReactNode; icon?: LucideIcon; className?: string
}) {
  const styles = {
    info: 'border-info/20 bg-info-soft text-info',
    success: 'border-success/20 bg-success-soft text-success',
    warning: 'border-warning/25 bg-warning-soft text-warning',
    danger: 'border-danger/20 bg-danger-soft text-danger',
  }
  return (
    <div className={cn('flex gap-3 rounded-lg border px-3.5 py-3 text-sm', styles[variant], className)} role={variant === 'danger' ? 'alert' : undefined}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-fg-2')}>{children}</div>}
      </div>
    </div>
  )
}
