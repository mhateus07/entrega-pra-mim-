'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Bike, Star } from 'lucide-react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import Pagination from '@/components/ui/Pagination'
import { PageHeader, Segmented, EmptyState } from '@/components/ui/Feedback'
import { MotoboyStatusBadge } from '@/components/ui/StatusBadge'
import { TableCard, Table, THead, TBody, TH, TD } from '@/components/ui/Table'
import { StackedBar } from '@/components/charts/DashboardCharts'
import { LABELS_STATUS_MOTOBOY } from '@/utils/helpers'
import type { StatusMotoboy } from '@prisma/client'

interface Motoboy {
  id: string
  status: StatusMotoboy
  avaliacaoMedia: number
  totalEntregas: number
  cnh: string
  veiculoModelo: string
  veiculoPlaca: string
  user: { nome: string; email: string; telefone: string }
  _count?: { pedidos: number }
}

const STATUS: (StatusMotoboy | 'TODOS')[] = ['TODOS', 'DISPONIVEL', 'EM_ENTREGA', 'OFFLINE']

function Avatar({ nome }: { nome: string }) {
  const p = nome.trim().split(/\s+/)
  const ini = ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-fg-2">{ini}</span>
}

export default function MotoboysAdminPage() {
  const { status } = useSession()
  const router = useRouter()
  const [filtroStatus, setFiltroStatus] = useState<StatusMotoboy | 'TODOS'>('TODOS')

  const list = usePaginatedList<Motoboy>(status === 'authenticated' ? `/api/motoboys${filtroStatus === 'TODOS' ? '' : `?status=${filtroStatus}`}` : null, 30_000)
  const motoboys = list.data
  const total = Object.values(list.summary).reduce((a, b) => a + b, 0)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  return (
    <>
      <PageHeader title="Entregadores" description="Cadastro, disponibilidade e desempenho da frota." />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_2fr]">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-[13px] text-fg-3">Frota cadastrada</p>
          <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-fg">{total}</p>
          <p className="mt-2 text-xs text-fg-3">
            {total ? `${Math.round((((list.summary.DISPONIVEL ?? 0) + (list.summary.EM_ENTREGA ?? 0)) / total) * 100)}% online agora` : 'Nenhum entregador cadastrado'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <p className="mb-3 text-[13px] text-fg-3">Situação atual</p>
          <StackedBar
            segments={[
              { key: 'd', label: 'Disponíveis', value: list.summary.DISPONIVEL ?? 0, color: 'var(--chart-3)' },
              { key: 'e', label: 'Em entrega', value: list.summary.EM_ENTREGA ?? 0, color: 'var(--chart-1)' },
              { key: 'o', label: 'Offline', value: list.summary.OFFLINE ?? 0, color: 'var(--border-strong)' },
            ]}
          />
        </div>
      </div>

      <div className="mb-4">
        <Segmented
          value={filtroStatus}
          onChange={setFiltroStatus}
          options={STATUS.map((s) => ({
            value: s,
            label: s === 'TODOS' ? 'Todos' : LABELS_STATUS_MOTOBOY[s],
            count: s === 'TODOS' ? total : list.summary[s] ?? 0,
          }))}
        />
      </div>

      <TableCard>
        {motoboys.length === 0 ? (
          list.loading ? (
            <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
          ) : (
            <EmptyState icon={Bike} title="Nenhum entregador encontrado" description="Não há entregadores com este status no momento." />
          )
        ) : (
          <Table className="min-w-[720px]">
            <THead>
              <tr>
                <TH>Entregador</TH>
                <TH>Contato</TH>
                <TH>Veículo</TH>
                <TH>Status</TH>
                <TH className="text-right">Entregas</TH>
                <TH className="text-right">Avaliação</TH>
              </tr>
            </THead>
            <TBody>
              {motoboys.map((m) => (
                <tr key={m.id} className="hover:bg-surface-2/60">
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar nome={m.user.nome} />
                      <span className="font-medium text-fg">{m.user.nome}</span>
                    </div>
                  </TD>
                  <TD>
                    <p className="text-fg-2">{m.user.telefone}</p>
                    <p className="text-xs text-fg-3">{m.user.email}</p>
                  </TD>
                  <TD>
                    <p className="text-fg-2">{m.veiculoModelo}</p>
                    <p className="font-mono text-xs text-fg-3">{m.veiculoPlaca}</p>
                  </TD>
                  <TD><MotoboyStatusBadge status={m.status} /></TD>
                  <TD className="text-right tabular text-fg">{m.totalEntregas}</TD>
                  <TD className="text-right tabular text-fg-2">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current text-chart-4" aria-hidden="true" />
                      {m.avaliacaoMedia.toFixed(1)}
                    </span>
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableCard>
      <Pagination pagination={list.pagination} onPageChange={list.setPage} loading={list.loading} error={list.error} />
    </>
  )
}
