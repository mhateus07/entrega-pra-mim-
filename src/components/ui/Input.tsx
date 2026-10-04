'use client'

import { InputHTMLAttributes, ReactNode, forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leading?: ReactNode
  trailing?: ReactNode
}

export const fieldClass = cn(
  'block w-full rounded-lg border bg-surface text-sm text-fg shadow-xs transition-colors',
  'placeholder:text-fg-3',
  'focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-[var(--ring)]',
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-3'
)

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leading, trailing, type = 'text', id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-fg-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leading && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-3">{leading}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              fieldClass,
              'h-10 px-3',
              leading && 'pl-9',
              trailing && 'pr-10',
              error ? 'border-danger focus:border-danger' : 'border-line-strong',
              className
            )}
            {...props}
          />
          {trailing && <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-[13px] text-danger">{error}</p>
        ) : helperText ? (
          <p id={`${inputId}-help`} className="mt-1.5 text-[13px] text-fg-3">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
