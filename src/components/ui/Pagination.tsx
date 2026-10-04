'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Pagination as PageInfo } from '@/lib/pagination'
import { buttonClass } from './Button'

export default function Pagination({ pagination, onPageChange, loading, error }: {
  pagination: PageInfo; onPageChange: (page: number) => void; loading?: boolean; error?: string | null
}) {
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 py-4 text-[13px] text-fg-3">
      <span aria-live="polite" className={error ? 'text-danger' : undefined}>
        {error || (loading ? 'Carregando…' : `Página ${pagination.page} de ${pagination.totalPages} · ${pagination.total} ${pagination.total === 1 ? 'registro' : 'registros'}`)}
      </span>
      <div className="flex gap-2">
        <button type="button" className={buttonClass('outline', 'sm')} disabled={loading || pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
        </button>
        <button type="button" className={buttonClass('outline', 'sm')} disabled={loading || pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>
          Próxima <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
