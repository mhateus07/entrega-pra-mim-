'use client'

import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              "block text-sm font-medium mb-2 transition-colors duration-200",
              isFocused ? "text-cyan-600 dark:text-cyan-400" : "text-slate-600 dark:text-slate-400"
            )}
          >
            {label}
          </label>
        )}
        <motion.div
          className="relative"
          animate={{
            scale: isFocused ? 1.01 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          <input
            ref={ref}
            type={type}
            className={cn(
              'block w-full rounded-xl px-4 py-3 text-sm transition-all duration-300',
              'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl',
              'text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500',
              'focus:outline-none',
              error
                ? 'border-2 border-red-400/50 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                : 'border border-slate-200/50 dark:border-slate-700/50 focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.2)]',
              'disabled:bg-slate-100/50 dark:disabled:bg-slate-900/50 disabled:text-slate-400 disabled:cursor-not-allowed',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              onBlur?.(e)
            }}
            {...props}
          />

          {/* Glow effect when focused */}
          <AnimatePresence>
            {isFocused && !error && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  boxShadow: '0 0 0 2px rgba(6, 182, 212, 0.1)',
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </motion.p>
          )}
          {helperText && !error && (
            <motion.p
              className="mt-2 text-sm text-slate-500 dark:text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
