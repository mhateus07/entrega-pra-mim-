'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Clock, CreditCard, Package, RefreshCw, Star } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader, Segmented, Alert, EmptyState } from '@/components/ui/Feedback'
import { PedidoStatusBadge, MotoboyStatusBadge } from '@/components/ui/StatusBadge'
import { BarList, DemandHeatmap, KpiCard, StackedBar, TrendChart, fmt, type PontoSerie } from '@/components/charts/DashboardCharts'
import { LABELS_TIPO_SERVICO, codigoPedido } from '@/utils/helpers'
import { cn } from '@/utils/cn'
import type { StatusMotoboy, StatusPedido, TipoServico } from '@prisma/client'

type Par = { atual: number; anterior: number }

interface DashboardData {
  periodo: { dias: number; inicio: string; fim: string }
  atualizadoEm: string
  kpis: Record<'receita' | 'receitaPlataforma' | 'pedidos' | 'entregues' | 'ticketMedio' | 'tempoMedioEntrega' | 'taxaCancelamento', Par>
  serie: PontoSerie[]
  operacao: { aguardando: number; aceitos: number; emColeta: number; emEntrega: number; atrasados: number; atrasoMinutos: number; pagamentosPendentes: number }
  frota: { disponivel: number; emEntrega: number; offline: number }
  statusPeriodo: { status: StatusPedido; label: string; quantidade: number }[]
  servicos: { tipo: TipoServico; label: string; pedidos: number; valor: number }[]
  metodos: { metodo: string; label: string; valor: number; quantidade: number }[]
  demanda: number[][]
  topEntregadores: { id: string; nome: string; status: StatusMotoboy; avaliacao: number | null; entregas: number; valor: number }[]
  topClientes: { id: string; nome: string; pedidos: number; valor: number }[]
  topBairros: { bairro: string; pedidos: number }[]
  pedidosRecentes: {
    id: string
    status: StatusPedido
    tipoServico: TipoServico
    valorTotal: number
    createdAt: string
    cliente: { user: { nome: string } } | null
    enderecoOrigem: { bairro: string } | null
    enderecoDestino: { bairro: string } | null
  }[]
}

const PERIODOS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
] as const

type Periodo = (typeof PERIODOS)[number]['value']

function tempoRelativo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando painel">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[136px] rounded-xl" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="skeleton h-[380px] rounded-xl xl:col-span-2" />
        <div className="skeleton h-[380px] rounded-xl" />
      </div>
    </div>
  )
}

function PipelineStep({ label, value, tone }: { label: string; value: number; tone?: 'warning' }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-2.5">
      <p className="text-xs text-fg-3">{label}</p>
      <p className={cn('mt-0.5 text-xl font-semibold tabular', tone === 'warning' && value > 0 ? 'text-warning' : 'text-fg')}>{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const [data, setData] = useState<DashboardData | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const carregar = useCallback(async (dias: Periodo, signal?: AbortSignal) => {
    setAtualizando(true)
    try {
      const response = await fetch(`/api/dashboard?dias=${dias}`, { signal })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Não foi possível carregar o painel')
      setData(result.data)
      setErro(null)
    } catch (error) {
      if (signal?.aborted) return
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar o painel')
    } finally {
      if (!signal?.aborted) setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    const controller = new AbortController()
    void carregar(periodo, controller.signal)
    const timer = setInterval(() => void carregar(periodo, controller.signal), 60_000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [status, periodo, carregar])

  const hojeTexto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hoje = hojeTexto.charAt(0).toUpperCase() + hojeTexto.slice(1)

  return (
    <>
      <PageHeader
        eyebrow={hoje}
        title="Visão geral"
        description={data ? `Indicadores dos últimos ${data.periodo.dias} dias comparados ao período anterior.` : 'Indicadores da operação.'}
        actions={
          <>
            <Segmented value={periodo} onChange={setPeriodo} options={PERIODOS.map((p) => ({ ...p }))} />
            <button
              type="button"
              onClick={() => void carregar(periodo)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-[13px] text-fg-2 shadow-xs hover:bg-surface-2"
              aria-label="Atualizar dados"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', atualizando && 'animate-spin')} aria-hidden="true" />
              <span className="tabular">
                {data ? new Date(data.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Atualizar'}
              </span>
            </button>
          </>
        }
      />

      {erro && !data && <Alert variant="danger" icon={AlertTriangle} title="Erro ao carregar o painel">{erro}</Alert>}
      {!data && !erro && <Skeleton />}

      {data && (
        <div className={cn('space-y-4 transition-opacity', atualizando && 'opacity-70')}>
          {data.operacao.atrasados > 0 && (
            <Alert variant="warning" icon={Clock} title={`${data.operacao.atrasados} ${data.operacao.atrasados === 1 ? 'pedido aguarda' : 'pedidos aguardam'} entregador há mais de ${data.operacao.atrasoMinutos} minutos`}>
              <Link href="/dashboard/pedidos" className="inline-flex items-center gap-1 font-medium text-fg underline-offset-2 hover:underline">
                Ver fila de pedidos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Alert>
          )}

          {/* KPIs */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" aria-label="Indicadores principais">
            <KpiCard label="Receita" value={fmt.moeda(data.kpis.receita.atual)} {...data.kpis.receita} serie={data.serie.map((s) => s.receita)} />
            <KpiCard label="Pedidos" value={fmt.inteiro(data.kpis.pedidos.atual)} {...data.kpis.pedidos} serie={data.serie.map((s) => s.pedidos)} />
            <KpiCard label="Entregas concluídas" value={fmt.inteiro(data.kpis.entregues.atual)} {...data.kpis.entregues} serie={data.serie.map((s) => s.entregues)} />
            <KpiCard label="Ticket médio" value={fmt.moeda(data.kpis.ticketMedio.atual)} {...data.kpis.ticketMedio} />
            <KpiCard label="Tempo médio de entrega" value={fmt.minutos(data.kpis.tempoMedioEntrega.atual)} {...data.kpis.tempoMedioEntrega} menorMelhor hint="pedido → entrega" />
            <KpiCard label="Cancelamentos" value={fmt.pct(data.kpis.taxaCancelamento.atual)} {...data.kpis.taxaCancelamento} menorMelhor hint="dos pedidos criados" />
          </section>

          {/* Tendência + operação */}
          <section className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Desempenho diário</CardTitle>
                  <CardDescription>
                    Receita aprovada para a plataforma: <span className="font-medium text-fg-2">{fmt.moeda(data.kpis.receitaPlataforma.atual)}</span>
                  </CardDescription>
                </div>
              </CardHeader>
              <TrendChart
                data={data.serie}
                totais={{ receita: data.kpis.receita.atual, pedidos: data.kpis.pedidos.atual, entregues: data.kpis.entregues.atual }}
              />
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  <CardTitle>Operação agora</CardTitle>
                </div>
                <CardDescription>Pedidos em aberto e situação da frota</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-2 gap-2">
                <PipelineStep label="Aguardando entregador" value={data.operacao.aguardando} tone="warning" />
                <PipelineStep label="Aceitos" value={data.operacao.aceitos} />
                <PipelineStep label="Em coleta" value={data.operacao.emColeta} />
                <PipelineStep label="Em rota de entrega" value={data.operacao.emEntrega} />
              </div>

              <div className="mt-5">
                <p className="mb-2 text-[13px] font-medium text-fg">
                  Frota <span className="font-normal text-fg-3">· {data.frota.disponivel + data.frota.emEntrega + data.frota.offline} entregadores</span>
                </p>
                <StackedBar
                  segments={[
                    { key: 'disp', label: 'Disponíveis', value: data.frota.disponivel, color: 'var(--chart-3)' },
                    { key: 'rota', label: 'Em entrega', value: data.frota.emEntrega, color: 'var(--chart-1)' },
                    { key: 'off', label: 'Offline', value: data.frota.offline, color: 'var(--border-strong)' },
                  ]}
                />
              </div>

              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 text-[13px]">
                  <span className="flex items-center gap-2 text-fg-2">
                    <CreditCard className="h-4 w-4 text-fg-3" aria-hidden="true" /> Pagamentos pendentes
                  </span>
                  <span className="font-semibold tabular text-fg">{data.operacao.pagamentosPendentes}</span>
                </div>
              </div>
            </Card>
          </section>

          {/* Demanda + status */}
          <section className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Demanda por dia e horário</CardTitle>
                <CardDescription>Pedidos criados no período — use para dimensionar a escala de entregadores</CardDescription>
              </CardHeader>
              <DemandHeatmap matrix={data.demanda} />
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Situação dos pedidos</CardTitle>
                <CardDescription>Pedidos criados no período, por status atual</CardDescription>
              </CardHeader>
              <BarList
                items={data.statusPeriodo.map((s) => ({
                  key: s.status,
                  label: <PedidoStatusBadge status={s.status} />,
                  value: s.quantidade,
                  detail: data.kpis.pedidos.atual ? fmt.pct((s.quantidade / data.kpis.pedidos.atual) * 100) : undefined,
                }))}
              />
            </Card>
          </section>

          {/* Mix */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Tipos de serviço</CardTitle>
                <CardDescription>Valor dos pedidos não cancelados</CardDescription>
              </CardHeader>
              <BarList
                format={fmt.moeda}
                items={data.servicos.map((s) => ({ key: s.tipo, label: LABELS_TIPO_SERVICO[s.tipo], value: s.valor, detail: `${s.pedidos} ped.` }))}
              />
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Formas de pagamento</CardTitle>
                <CardDescription>Pagamentos aprovados no período</CardDescription>
              </CardHeader>
              <BarList
                format={fmt.moeda}
                items={data.metodos.map((m) => ({ key: m.metodo, label: m.label, value: m.valor, detail: `${m.quantidade}×` }))}
              />
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Principais destinos</CardTitle>
                <CardDescription>Bairros com mais entregas solicitadas</CardDescription>
              </CardHeader>
              <BarList items={data.topBairros.map((b) => ({ key: b.bairro, label: b.bairro, value: b.pedidos }))} />
            </Card>
          </section>

          {/* Rankings */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Card padding={false}>
              <div className="flex items-center justify-between px-5 pt-5">
                <div>
                  <CardTitle>Entregadores em destaque</CardTitle>
                  <CardDescription className="mt-1">Por entregas concluídas no período</CardDescription>
                </div>
                <Link href="/dashboard/motoboys" className="text-[13px] font-medium text-fg-2 hover:text-fg">Ver todos</Link>
              </div>
              {data.topEntregadores.length === 0 ? (
                <EmptyState title="Nenhuma entrega concluída no período" />
              ) : (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface-2/60 text-left text-xs text-fg-3">
                      <th className="py-2 pl-5 pr-2 font-medium">#</th>
                      <th className="px-2 py-2 font-medium">Entregador</th>
                      <th className="px-2 py-2 text-right font-medium">Entregas</th>
                      <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Valor</th>
                      <th className="py-2 pl-2 pr-5 text-right font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.topEntregadores.map((m, i) => (
                      <tr key={m.id}>
                        <td className="py-2.5 pl-5 pr-2 tabular text-fg-3">{i + 1}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-fg">{m.nome}</span>
                            <MotoboyStatusBadge status={m.status} className="hidden h-5 px-1.5 text-[11px] md:inline-flex" />
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular text-fg">{m.entregas}</td>
                        <td className="hidden px-2 py-2.5 text-right tabular text-fg-2 sm:table-cell">{fmt.moeda(m.valor)}</td>
                        <td className="py-2.5 pl-2 pr-5 text-right tabular text-fg-2">
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-current text-chart-4" aria-hidden="true" />
                            {m.avaliacao?.toFixed(1) ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card padding={false}>
              <div className="flex items-center justify-between px-5 pt-5">
                <div>
                  <CardTitle>Maiores clientes</CardTitle>
                  <CardDescription className="mt-1">Por valor pago no período</CardDescription>
                </div>
                <Link href="/dashboard/clientes" className="text-[13px] font-medium text-fg-2 hover:text-fg">Ver todos</Link>
              </div>
              {data.topClientes.length === 0 ? (
                <EmptyState title="Nenhum pagamento aprovado no período" />
              ) : (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface-2/60 text-left text-xs text-fg-3">
                      <th className="py-2 pl-5 pr-2 font-medium">#</th>
                      <th className="px-2 py-2 font-medium">Cliente</th>
                      <th className="px-2 py-2 text-right font-medium">Pedidos</th>
                      <th className="py-2 pl-2 pr-5 text-right font-medium">Valor pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.topClientes.map((c, i) => (
                      <tr key={c.id}>
                        <td className="py-2.5 pl-5 pr-2 tabular text-fg-3">{i + 1}</td>
                        <td className="max-w-[200px] truncate px-2 py-2.5 font-medium text-fg">{c.nome}</td>
                        <td className="px-2 py-2.5 text-right tabular text-fg-2">{c.pedidos}</td>
                        <td className="py-2.5 pl-2 pr-5 text-right tabular text-fg">{fmt.moeda(c.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>

          {/* Recentes */}
          <Card padding={false}>
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <CardTitle>Pedidos recentes</CardTitle>
                <CardDescription className="mt-1">Últimos pedidos recebidos</CardDescription>
              </div>
              <Link href="/dashboard/pedidos" className="inline-flex items-center gap-1 text-[13px] font-medium text-fg-2 hover:text-fg">
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {data.pedidosRecentes.length === 0 ? (
              <EmptyState icon={Package} title="Nenhum pedido ainda" description="Os pedidos aparecem aqui assim que os clientes solicitarem entregas." />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface-2/60 text-left text-xs text-fg-3">
                      <th className="py-2 pl-5 pr-3 font-medium">Pedido</th>
                      <th className="px-3 py-2 font-medium">Cliente</th>
                      <th className="px-3 py-2 font-medium">Trajeto</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Valor</th>
                      <th className="py-2 pl-3 pr-5 text-right font-medium">Criado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.pedidosRecentes.map((p) => (
                      <tr key={p.id} onClick={() => router.push(`/dashboard/pedidos/${p.id}`)} className="cursor-pointer hover:bg-surface-2/60">
                        <td className="py-3 pl-5 pr-3">
                          <Link href={`/dashboard/pedidos/${p.id}`} className="font-mono text-[13px] text-fg hover:underline" onClick={(e) => e.stopPropagation()}>
                            {codigoPedido(p.id)}
                          </Link>
                          <p className="text-xs text-fg-3">{LABELS_TIPO_SERVICO[p.tipoServico]}</p>
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-3 text-fg">{p.cliente?.user?.nome ?? '—'}</td>
                        <td className="px-3 py-3 text-fg-2">
                          {p.enderecoOrigem?.bairro ?? '—'} <span className="text-fg-3">→</span> {p.enderecoDestino?.bairro ?? '—'}
                        </td>
                        <td className="px-3 py-3"><PedidoStatusBadge status={p.status} /></td>
                        <td className="px-3 py-3 text-right tabular text-fg">{fmt.moeda(p.valorTotal)}</td>
                        <td className="py-3 pl-3 pr-5 text-right text-fg-3">{tempoRelativo(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
