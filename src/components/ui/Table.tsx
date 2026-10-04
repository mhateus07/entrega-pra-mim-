import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function TableCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-hidden rounded-xl border border-line bg-surface shadow-xs', className)} {...props} />
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-line bg-surface-2/60', className)} {...props} />
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-line', className)} {...props} />
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-2.5 text-left text-xs font-medium text-fg-3 first:pl-5 last:pr-5', className)} {...props} />
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle first:pl-5 last:pr-5', className)} {...props} />
}
