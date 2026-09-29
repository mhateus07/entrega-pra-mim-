'use client'
import type { Pagination as PageInfo } from '@/lib/pagination'

export default function Pagination({ pagination, onPageChange, loading, error }: {
  pagination: PageInfo; onPageChange: (page: number) => void; loading?: boolean; error?: string | null
}) {
  return <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
    <span aria-live="polite">{error || (loading ? 'Carregando...' : `Página ${pagination.page} de ${pagination.totalPages} · ${pagination.total} registros`)}</span>
    <div className="flex gap-3">
      <button type="button" className="px-3 py-2 rounded border disabled:opacity-40" disabled={loading || pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Anterior</button>
      <button type="button" className="px-3 py-2 rounded border disabled:opacity-40" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Próxima</button>
    </div>
  </nav>
}
