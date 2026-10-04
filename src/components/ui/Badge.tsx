import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'outline'
  size?: 'sm' | 'md'
  dot?: boolean
}

const variants = {
  default: 'bg-surface-2 text-fg-2',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  brand: 'bg-brand-soft text-brand',
  outline: 'border border-line text-fg-2',
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', dot, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium',
        size === 'sm' ? 'h-5 px-1.5 text-[11.5px]' : 'h-6 px-2 text-xs',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
)

Badge.displayName = 'Badge'

export default Badge
