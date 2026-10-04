'use client'

import { TextareaHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'
import { fieldClass } from './Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, id, ...props }, ref) => {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="w-full">
      {label && <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-fg-2">{label}</label>}
      <textarea
        ref={ref}
        id={fieldId}
        className={cn(fieldClass, 'min-h-[88px] px-3 py-2.5', error ? 'border-danger' : 'border-line-strong', className)}
        {...props}
      />
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
