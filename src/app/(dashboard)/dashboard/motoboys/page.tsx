'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Bike, Check, Star, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import Pagination from '@/components/ui/Pagination'
import { PageHeader, Segmented, EmptyState } from '@/components/ui/Feedback'
import { MotoboyStatusBadge } from '@/components/ui/StatusBadge'
import { TableCard, Table, THead, TBody, TH, TD } from '@/components/ui/Table'
import { StackedBar } from '@/components/charts/DashboardCharts'
import { LABELS_STATUS_MOTOBOY } from '@/utils/helpers'
import type { AprovacaoMotoboy, StatusMotoboy } from '@prisma/client'

interface Motoboy {
  id: string
  status: StatusMotoboy
  aprovacao: AprovacaoMotoboy
  motivoAprovacao: string | null
  avaliacaoMedia: number
  totalEntregas: number
  cnh: string
  veiculoModelo: string
  veiculoPlaca: string
  user: { nome: string; email: string; telefone: string }
  _count?: { pedidos: number }
}

type Filtro = StatusMotoboy | 'TODOS' | 'PENDENTES'
const STATUS: Filtro[] = ['TODOS', 'PENDENTES', 'DISPONIVEL', 'EM_ENTREGA', 'OFFLINE']

const APROVACAO: Record<AprovacaoMotoboy, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  PENDENTE_APROVACAO: { label: 'Aguardando', variant: 'warning' },
  APROVADO: { label: 'Aprovado', variant: 'success' },
  REPROVADO: { label: 'Reprovado', variant: 'danger' },
  SUSPENSO: { label: 'Suspenso', variant: 'danger' },
}

function urlFiltro(filtro: Filtro) {
  if (filtro === 'TODOS') return '/api/motoboys'
  if (filtro === 'PENDENTES') return '/api/motoboys?aprovacao=PENDENTE_APROVACAO'
  return `/api/motoboys?status=${filtro}`
}

function Avatar({ nome }: { nome: string }) {
  const p = nome.trim().split(/\s+/)
  const ini = ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-fg-2">{ini}</span>
}

export default function MotoboysAdminPage() {
  const { status } = useSession()
  const router = useRouter()
  const [filtroStatus, setFiltroStatus] = useState<Filtro>('TODOS')
  // Decisões tomadas nesta tela aparecem na hora, sem esperar o próximo polling
  const [alterados, setAlterados] = useState<Record<string, Pick<Motoboy, 'aprovacao' | 'motivoAprovacao' | 'status'>>>({})
  const [motivo, setMotivo] = useState<{ id: string; acao: 'REPROVADO' | 'SUSPENSO'; texto: string } | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)

  const list = usePaginatedList<Motoboy>(status === 'authenticated' ? urlFiltro(filtroStatus) : null, 30_000)
  const motoboys = list.data.map((m) => ({ ...m, ...alterados[m.id] }))
  const total = (list.summary.DISPONIVEL ?? 0) + (list.summary.EM_ENTREGA ?? 0) + (list.summary.OFFLINE ?? 0)

  const decidir = async (id: string, aprovacao: 'APROVADO' | 'REPROVADO' | 'SUSPENSO', texto?: string) => {
    setSalvando(id)
    try {
      const response = await fetch(`/api/motoboys/${id}/aprovacao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprovacao, motivo: texto || undefined }),
      })
      const body = await response.json()
      if (!body.success) throw new Error(body.error || 'Erro ao atualizar cadastro')
      setAlterados((prev) => ({ ...prev, [id]: { aprovacao: body.data.aprovacao, motivoAprovacao: body.data.motivoAprovacao, status: body.data.status } }))
      setMotivo(null)
      toast.success(aprovacao === 'APROVADO' ? 'Entregador aprovado' : 'Cadastro atualizado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar cadastro')
    } finally {
      setSalvando(null)
    }
  }

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
            label: s === 'TODOS' ? 'Todos' : s === 'PENDENTES' ? 'Aguardando aprovação' : LABELS_STATUS_MOTOBOY[s],
            count: s === 'TODOS' ? total : s === 'PENDENTES' ? list.summary.PENDENTE_APROVACAO ?? 0 : list.summary[s] ?? 0,
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
          <Table className="min-w-[900px]">
            <THead>
              <tr>
                <TH>Entregador</TH>
                <TH>Contato</TH>
                <TH>Veículo</TH>
                <TH>Status</TH>
                <TH>Cadastro</TH>
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
                  <TD>
                    {motivo?.id === m.id ? (
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => { e.preventDefault(); if (motivo.texto.trim()) decidir(m.id, motivo.acao, motivo.texto.trim()) }}
                      >
                        <input
                          autoFocus
                          value={motivo.texto}
                          onChange={(e) => setMotivo({ ...motivo, texto: e.target.value })}
                          placeholder="Motivo"
                          maxLength={191}
                          aria-label="Motivo"
                          className="h-8 w-36 rounded-md border border-line bg-surface px-2 text-sm text-fg"
                        />
                        <Button type="submit" size="sm" variant="danger" disabled={!motivo.texto.trim() || salvando === m.id}>
                          {motivo.acao === 'SUSPENSO' ? 'Suspender' : 'Reprovar'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setMotivo(null)} aria-label="Cancelar"><X className="h-3.5 w-3.5" /></Button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant={APROVACAO[m.aprovacao].variant} title={m.motivoAprovacao ?? undefined}>{APROVACAO[m.aprovacao].label}</Badge>
                        {m.aprovacao !== 'APROVADO' && (
                          <Button size="sm" variant="outline" disabled={salvando === m.id} onClick={() => decidir(m.id, 'APROVADO')}>
                            <Check className="h-3.5 w-3.5" /> Aprovar
                          </Button>
                        )}
                        {m.aprovacao === 'PENDENTE_APROVACAO' && (
                          <Button size="sm" variant="ghost" disabled={salvando === m.id} onClick={() => setMotivo({ id: m.id, acao: 'REPROVADO', texto: '' })}>Reprovar</Button>
                        )}
                        {m.aprovacao === 'APROVADO' && (
                          <Button size="sm" variant="ghost" disabled={salvando === m.id} onClick={() => setMotivo({ id: m.id, acao: 'SUSPENSO', texto: '' })}>Suspender</Button>
                        )}
                      </div>
                    )}
                  </TD>
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
