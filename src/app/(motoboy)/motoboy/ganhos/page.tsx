'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Pagination from '@/components/ui/Pagination'
import type { Pagination as PageInfo } from '@/lib/pagination'
import { ArrowDownLeft, ArrowUpRight, Landmark, Receipt } from 'lucide-react'
import Header from '@/components/ui/Header'
import { Card, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { EmptyState, FullPageLoader, PageHeader, Segmented } from '@/components/ui/Feedback'
import { DailyBars } from '@/components/charts/DashboardCharts'
import { formatarMoeda } from '@/lib/pricing'
import { formatarDataHora } from '@/utils/helpers'

interface Transacao {
  id: string
  tipo: 'CREDITO' | 'DEBITO' | 'SAQUE'
  valor: number
  descricao: string
  status: 'PENDENTE' | 'CONCLUIDO' | 'PROCESSADO' | 'CANCELADO'
  createdAt: string
  pedido: {
    id: string
    tipoServico: string
    valorTotal: number
    entregueEm: string | null
    enderecoOrigem: { bairro: string; cidade: string }
    enderecoDestino: { bairro: string; cidade: string }
  } | null
}

interface Saldo {
  saldoDisponivel: number
  saldoPendente: number
  totalRecebido: number
}

interface Totais {
  creditos: number
  debitos: number
  saques: number
  liquido: number
}

export default function GanhosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [totais, setTotais] = useState<Totais | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [filtro, setFiltro] = useState<'todos' | 'CREDITO' | 'DEBITO' | 'SAQUE'>('todos')
  const [serie, setSerie] = useState<{ data: string; valor: number; entregas: number }[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      if (!session?.user?.motoboyId) return

      try {
        // Buscar saldo
        const saldoRes = await fetch(`/api/motoboys/${session.user.motoboyId}/saldo`)
        const saldoData = await saldoRes.json()
        if (!cancelled && saldoData.success) {
          setSaldo(saldoData.data)
        }

        const resumoRes = await fetch(`/api/motoboys/${session.user.motoboyId}/resumo`)
        const resumoData = await resumoRes.json()
        if (!cancelled && resumoData.success) {
          setSerie(resumoData.data.ganhosDiarios ?? [])
        }

        // Buscar transações
        const tipoParam = filtro !== 'todos' ? `&tipo=${filtro}` : ''
        const transRes = await fetch(
          `/api/motoboys/${session.user.motoboyId}/transacoes?limit=20&page=${page}${tipoParam}`
        )
        const transData = await transRes.json()
        if (!cancelled && transData.success) {
          setTransacoes(transData.data.transacoes)
          setPagination(transData.pagination)
          setTotais(transData.data.totais)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchData()
    }
    return () => { cancelled = true }
  }, [status, session, filtro, page])

  if (status === 'loading' || isLoading) return <FullPageLoader />

  const tipoInfo: Record<string, { label: string; icon: typeof ArrowDownLeft; tone: string }> = {
    CREDITO: { label: 'Crédito', icon: ArrowDownLeft, tone: 'bg-success-soft text-success' },
    DEBITO: { label: 'Débito', icon: ArrowUpRight, tone: 'bg-danger-soft text-danger' },
    SAQUE: { label: 'Saque', icon: Landmark, tone: 'bg-surface-2 text-fg-2' },
  }

  const statusBadge = (st: string) => {
    switch (st) {
      case 'CONCLUIDO':
      case 'PROCESSADO':
        return <Badge variant="success">Processado</Badge>
      case 'PENDENTE':
        return <Badge variant="warning">Pendente</Badge>
      case 'CANCELADO':
        return <Badge variant="danger">Cancelado</Badge>
      default:
        return null
    }
  }

  const total14 = serie.reduce((a, d) => a + d.valor, 0)
  const entregas14 = serie.reduce((a, d) => a + d.entregas, 0)

  return (
    <div className="min-h-screen bg-page">
      <Header userName={session?.user?.name} userRole="MOTOBOY" />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <PageHeader title="Ganhos" description="Saldo, repasses e histórico de transações." />

        <section className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <p className="text-[13px] text-fg-3">Disponível</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight tabular text-fg">{formatarMoeda(saldo?.saldoDisponivel || 0)}</p>
            <p className="mt-2 text-xs text-fg-3">Pronto para saque</p>
          </div>
          <div className="p-5">
            <p className="text-[13px] text-fg-3">A liberar</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight tabular text-fg-2">{formatarMoeda(saldo?.saldoPendente || 0)}</p>
            <p className="mt-2 text-xs text-fg-3">Aguardando liberação</p>
          </div>
          <div className="p-5">
            <p className="text-[13px] text-fg-3">Total recebido</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight tabular text-fg">{formatarMoeda(saldo?.totalRecebido || 0)}</p>
            <p className="mt-2 text-xs text-fg-3">Desde o cadastro</p>
          </div>
        </section>

        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardTitle>Últimos 14 dias</CardTitle>
              <p className="mt-1 text-[13px] text-fg-3">Créditos de entregas por dia</p>
            </div>
            <p className="text-sm text-fg-2">
              <span className="font-semibold tabular text-fg">{formatarMoeda(total14)}</span> em {entregas14} {entregas14 === 1 ? 'entrega' : 'entregas'}
            </p>
          </div>
          {serie.length ? <DailyBars data={serie} label="Ganhos" /> : <p className="py-10 text-center text-[13px] text-fg-3">Sem dados no período</p>}
        </Card>

        {totais && (
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {[
              { l: 'Créditos', v: `+${formatarMoeda(totais.creditos)}`, c: 'text-success' },
              { l: 'Débitos', v: `−${formatarMoeda(totais.debitos)}`, c: 'text-fg' },
              { l: 'Saques', v: `−${formatarMoeda(totais.saques)}`, c: 'text-fg' },
              { l: 'Líquido', v: formatarMoeda(totais.liquido), c: 'text-fg font-semibold' },
            ].map((t) => (
              <div key={t.l} className="bg-surface p-4">
                <p className="text-xs text-fg-3">{t.l}</p>
                <p className={`mt-1 text-[15px] font-medium tabular ${t.c}`}>{t.v}</p>
              </div>
            ))}
          </section>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-fg-2">Transações</h2>
          <Segmented
            size="sm"
            value={filtro}
            onChange={(f) => { setPage(1); setFiltro(f) }}
            options={[
              { value: 'todos', label: 'Todas' },
              { value: 'CREDITO', label: 'Créditos' },
              { value: 'DEBITO', label: 'Débitos' },
              { value: 'SAQUE', label: 'Saques' },
            ]}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          {transacoes.length === 0 ? (
            <EmptyState icon={Receipt} title="Nenhuma transação encontrada" />
          ) : (
            <ul className="divide-y divide-line">
              {transacoes.map((t) => {
                const info = tipoInfo[t.tipo] ?? tipoInfo.CREDITO
                const Icon = info.icon
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${info.tone}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{t.descricao}</p>
                      <p className="truncate text-xs text-fg-3">
                        {formatarDataHora(t.createdAt)}
                        {t.pedido && <> · {t.pedido.enderecoOrigem.bairro} → {t.pedido.enderecoDestino.bairro}</>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className={`text-sm font-semibold tabular ${t.tipo === 'CREDITO' ? 'text-success' : 'text-fg'}`}>
                        {t.tipo === 'CREDITO' ? '+' : '−'}{formatarMoeda(t.valor)}
                      </p>
                      {statusBadge(t.status)}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </main>
    </div>
  )
}
