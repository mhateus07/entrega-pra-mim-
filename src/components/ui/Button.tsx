'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden'

    const variants = {
      primary: 'bg-gradient-to-r from-[#0A4D68] to-[#06b6d4] text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] focus:ring-cyan-500 border border-cyan-400/20',
      secondary: 'bg-gradient-to-r from-slate-700 to-slate-600 text-white hover:shadow-[0_0_20px_rgba(100,116,139,0.4)] focus:ring-slate-500 border border-slate-500/20',
      outline: 'border-2 border-cyan-500/50 bg-transparent text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] focus:ring-cyan-500 backdrop-blur-sm',
      ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 focus:ring-slate-500 backdrop-blur-sm',
      danger: 'bg-gradient-to-r from-red-600 to-rose-500 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] focus:ring-red-500 border border-red-400/20',
      glass: 'bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] focus:ring-white/50',
    }

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-8 py-3.5 text-base',
    }

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {/* Shimmer effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
          initial={false}
          whileHover={{ translateX: '100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        {isLoading && (
          <motion.svg
            className="-ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </motion.svg>
        )}
        <span className="relative z-10">{children}</span>
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
