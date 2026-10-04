import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'brand' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

export const buttonVariants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-xs',
  brand: 'bg-brand text-white hover:bg-brand-hover shadow-xs',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3',
  outline: 'border border-line-strong bg-surface text-fg hover:bg-surface-2 shadow-xs',
  ghost: 'text-fg-2 hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white hover:opacity-90 shadow-xs',
  // Mantido por compatibilidade; equivale a outline.
  glass: 'border border-line-strong bg-surface text-fg hover:bg-surface-2 shadow-xs',
}

export const buttonSizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
  icon: 'h-9 w-9',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    'disabled:pointer-events-none disabled:opacity-50',
    buttonVariants[variant],
    buttonSizes[size],
    className
  )
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
)

Button.displayName = 'Button'

export default Button
