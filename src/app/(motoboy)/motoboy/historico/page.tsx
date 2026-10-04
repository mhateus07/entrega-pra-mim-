'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import Pagination from '@/components/ui/Pagination'
import Link from 'next/link'
import { ChevronRight, History, Star } from 'lucide-react'
import Header from '@/components/ui/Header'
import { EmptyState, FullPageLoader, PageHeader, Segmented } from '@/components/ui/Feedback'
import { PedidoStatusBadge } from '@/components/ui/StatusBadge'
import { formatarMoeda } from '@/lib/pricing'
import { formatarDataHora } from '@/utils/helpers'
import type { StatusPedido } from '@prisma/client'

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: string
  valorTotal: number
  distanciaKm: number
  createdAt: string
  entregueEm: string | null
  cliente: {
    user: {
      nome: string
    }
  }
  enderecoOrigem: {
    bairro: string
    cidade: string
  }
  enderecoDestino: {
    bairro: string
    cidade: string
  }
  avaliacao: {
    nota: number
    comentario: string | null
  } | null
}

interface Stats {
  cancelados: number
  totalEntregas: number
  ganhoTotal: number
  avaliacaoMedia: number
}

export default function HistoricoMotoboyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ cancelados: 0, totalEntregas: 0, ganhoTotal: 0, avaliacaoMedia: 5.0 })
  const [isLoading, setIsLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ENTREGUE' | 'CANCELADO'>('TODOS')

  const list = usePaginatedList<Pedido>(status === 'authenticated' && session?.user.motoboyId ? `/api/pedidos?motoboyId=${session.user.motoboyId}&grupo=finalizados${filtroStatus === 'TODOS' ? '' : `&status=${filtroStatus}`}` : null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchHistorico = async () => {
      if (!session?.user?.motoboyId) return

      try {
        const response = await fetch(`/api/motoboys/${session.user.motoboyId}/resumo`)
        const data = await response.json()

        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Erro ao carregar historico:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchHistorico()
    }
  }, [status, session])

  if (status === 'loading' || isLoading) return <FullPageLoader />

  const pedidosFiltrados = list.data
  const taxaConclusao = stats.totalEntregas + stats.cancelados
    ? Math.round((stats.totalEntregas / (stats.totalEntregas + stats.cancelados)) * 100)
    : null

  return (
    <div className="min-h-screen bg-page">
      <Header userName={session?.user?.name} userRole="MOTOBOY" />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <PageHeader title="Histórico" description="Entregas concluídas e canceladas." />

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {[
            { l: 'Entregas', v: String(stats.totalEntregas) },
            { l: 'Conclusão', v: taxaConclusao === null ? '—' : `${taxaConclusao}%` },
            { l: 'Ganho total', v: formatarMoeda(stats.ganhoTotal) },
            { l: 'Nota média', v: stats.avaliacaoMedia.toFixed(1), star: true },
          ].map((t) => (
            <div key={t.l} className="bg-surface p-4">
              <p className="text-xs text-fg-3">{t.l}</p>
              <p className="mt-1 flex items-center gap-1 text-lg font-semibold tabular text-fg">
                {t.star && <Star className="h-4 w-4 fill-current text-chart-4" aria-hidden="true" />}
                {t.v}
              </p>
            </div>
          ))}
        </section>

        <div className="pt-2">
          <Segmented
            size="sm"
            value={filtroStatus}
            onChange={setFiltroStatus}
            options={[
              { value: 'TODOS', label: 'Todas' },
              { value: 'ENTREGUE', label: 'Entregues' },
              { value: 'CANCELADO', label: 'Canceladas' },
            ]}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          {pedidosFiltrados.length === 0 ? (
            list.loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
            ) : (
              <EmptyState icon={History} title="Nenhuma entrega encontrada" description="Suas entregas finalizadas aparecem aqui." />
            )
          ) : (
            <ul className="divide-y divide-line">
              {pedidosFiltrados.map((p) => (
                <li key={p.id}>
                  <Link href={`/motoboy/pedido/${p.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-2/60 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fg">{p.enderecoOrigem.bairro} <span className="text-fg-3">→</span> {p.enderecoDestino.bairro}</p>
                      <p className="truncate text-xs text-fg-3">
                        {formatarDataHora(p.entregueEm || p.createdAt)} · {p.cliente.user.nome} · {p.distanciaKm.toFixed(1)} km
                      </p>
                    </div>
                    {p.avaliacao && (
                      <span className="hidden items-center gap-0.5 text-[13px] tabular text-fg-2 sm:flex">
                        <Star className="h-3.5 w-3.5 fill-current text-chart-4" aria-hidden="true" />{p.avaliacao.nota}
                      </span>
                    )}
                    <PedidoStatusBadge status={p.status} className="hidden sm:inline-flex" />
                    <span className="w-20 text-right text-sm font-medium tabular text-fg">{formatarMoeda(p.valorTotal)}</span>
                    <ChevronRight className="h-4 w-4 text-fg-3" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Pagination pagination={list.pagination} onPageChange={list.setPage} loading={list.loading} error={list.error} />
      </main>
    </div>
  )
}
