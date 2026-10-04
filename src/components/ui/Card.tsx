import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass' | 'gradient' | 'muted'
  /** Mantido por compatibilidade; cards não animam mais no hover. */
  hover?: boolean
  padding?: boolean
}

const variants = {
  default: 'bg-surface border border-line shadow-xs',
  bordered: 'bg-surface border border-line-strong',
  elevated: 'bg-surface border border-line shadow-card',
  glass: 'bg-surface border border-line shadow-xs',
  gradient: 'bg-surface border border-line shadow-xs',
  muted: 'bg-surface-2 border border-line',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover: _hover, padding = true, children, ...props }, ref) => {
    void _hover
    return (
      <div ref={ref} className={cn('rounded-xl', padding && 'p-5', variants[variant], className)} {...props}>
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mb-4 flex flex-col gap-1', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-[15px] font-semibold tracking-tight text-fg', className)} {...props} />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-[13px] text-fg-3', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mt-5 flex items-center gap-3 border-t border-line pt-4', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
