'use client'
import { useEffect, useState } from 'react'
import type { Pagination } from '@/lib/pagination'

export function usePaginatedList<T>(url: string | null, pollingInterval?: number) {
  const [selection, setSelection] = useState({ url, page: 1 })
  const page = selection.url === url ? selection.page : 1
  const [result, setResult] = useState<{ key: string; data: T[]; pagination: Pagination; summary?: Record<string, number>; error: string | null } | null>(null)
  const key = `${url}:${page}`
  useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    let running = false
    const load = async () => {
      if (running) return
      running = true
      try {
        const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}page=${page}&limit=20`, { signal: controller.signal })
        const body = await response.json()
        if (!response.ok || !body.success) throw new Error(body.error || 'Erro ao carregar lista')
        if (controller.signal.aborted) return
        if (page > body.pagination.totalPages) {
          setSelection({ url, page: body.pagination.totalPages })
          return
        }
        setResult({ key, data: body.data, pagination: body.pagination, summary: body.summary, error: null })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, data: [], pagination: { page, pageSize: 20, total: 0, totalPages: 1 }, error: error instanceof Error ? error.message : 'Erro ao carregar lista' })
      } finally { running = false }
    }
    void load()
    const timer = pollingInterval ? setInterval(load, pollingInterval) : undefined
    return () => { controller.abort(); if (timer) clearInterval(timer) }
  }, [url, page, key, pollingInterval])
  const current = result?.key === key ? result : null
  return {
    data: current?.data ?? [], pagination: current?.pagination ?? { page, pageSize: 20, total: 0, totalPages: 1 },
    summary: current?.summary ?? {},
    error: current?.error ?? null, loading: !!url && !current,
    setPage: (next: number) => setSelection({ url, page: next }),
  }
}
