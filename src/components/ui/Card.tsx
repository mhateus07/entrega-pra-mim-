'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/utils/cn'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass' | 'gradient'
  hover?: boolean
  children?: React.ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = true, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50',
      bordered: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-2 border-cyan-500/20 dark:border-cyan-400/20',
      elevated: 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl shadow-xl shadow-cyan-500/5 border border-white/30 dark:border-slate-700/50',
      glass: 'bg-white/10 dark:bg-slate-900/30 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)]',
      gradient: 'bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-800/80 dark:to-slate-900/40 backdrop-blur-xl border border-white/30 dark:border-slate-700/30',
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-2xl p-6 transition-all duration-300',
          variants[variant],
          hover && 'hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] hover:border-cyan-500/30',
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        whileHover={hover ? {
          y: -4,
          transition: { duration: 0.2 }
        } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mb-4', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-bold text-slate-800 dark:text-white', className)}
        {...props}
      >
        {children}
      </h3>
    )
  }
)

CardTitle.displayName = 'CardTitle'

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
