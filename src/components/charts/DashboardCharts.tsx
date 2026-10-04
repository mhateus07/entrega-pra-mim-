'use client'

import { ReactNode, useId, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'

/*
 * Convenções dos gráficos
 * - Cores por papel, via tokens CSS (--chart-*, --seq-*), com variantes de tema escuro.
 * - Um eixo por gráfico; métricas de escalas diferentes viram gráficos/abas separados.
 * - Marcas finas: linhas de 2px, barras com no máx. 24px e ponta arredondada de 4px.
 * - Grade em linha fina sólida e recessiva; texto sempre em tokens de texto.
 */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompacto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const inteiro = new Intl.NumberFormat('pt-BR')

export const fmt = {
  moeda: (v: number) => brl.format(v),
  moedaCompacta: (v: number) => (Math.abs(v) >= 1000 ? brlCompacto.format(v) : brl.format(v).replace(/,00$/, '')),
  inteiro: (v: number) => inteiro.format(Math.round(v)),
  minutos: (v: number) => {
    if (!v) return '—'
    const m = Math.round(v)
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}`
  },
  pct: (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
}

const diaCurto = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
const diaLongo = (iso: string) =>
  new Date(`${iso}T12:00:00-03:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })

/* ---------------------------------------------------------------- Sparkline */

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const id = useId().replace(/:/g, '')
  if (values.length < 2) return <div className={className} />
  const w = 120
  const h = 32
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 6)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('h-8 w-full overflow-visible', className)} aria-hidden="true">
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--chart-1)" stopOpacity="0.14" />
          <stop offset="1" stopColor="var(--chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ---------------------------------------------------------------- KPI */

export function Delta({ atual, anterior, menorMelhor, className }: { atual: number; anterior: number; menorMelhor?: boolean; className?: string }) {
  if (!anterior && !atual) return <span className={cn('text-xs text-fg-3', className)}>sem dados</span>
  if (!anterior) return <span className={cn('text-xs text-fg-3', className)}>sem base anterior</span>
  const diff = ((atual - anterior) / Math.abs(anterior)) * 100
  const neutro = Math.abs(diff) < 0.5
  const subiu = diff > 0
  const bom = neutro ? null : menorMelhor ? !subiu : subiu
  const Icon = neutro ? Minus : subiu ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular',
        bom === null ? 'text-fg-3' : bom ? 'text-success' : 'text-danger',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {neutro ? '0%' : `${Math.abs(diff).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
      <span className="sr-only">{bom === null ? 'estável' : bom ? 'melhora' : 'piora'} em relação ao período anterior</span>
    </span>
  )
}

export function KpiCard({
  label, value, atual, anterior, menorMelhor, serie, hint,
}: {
  label: string
  value: string
  atual: number
  anterior: number
  menorMelhor?: boolean
  serie?: number[]
  hint?: string
}) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-xs">
      <p className="text-[13px] text-fg-3">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-fg">{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <Delta atual={atual} anterior={anterior} menorMelhor={menorMelhor} />
        <span className="truncate text-xs text-fg-3">{hint ?? 'vs. período anterior'}</span>
      </div>
      {serie && <Sparkline values={serie} className="mt-3" />}
    </div>
  )
}

/* ---------------------------------------------------------------- Tooltip */

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-[160px] rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-pop">
      <p className="mb-1 font-medium capitalize text-fg">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-fg-3">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium tabular text-fg">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- Tendência */

export interface PontoSerie {
  data: string
  receita: number
  pedidos: number
  entregues: number
  cancelados: number
}

type Metrica = 'receita' | 'pedidos' | 'entregues'

const METRICAS: Record<Metrica, { label: string; format: (v: number) => string; axis: (v: number) => string }> = {
  receita: { label: 'Receita', format: fmt.moeda, axis: fmt.moedaCompacta },
  pedidos: { label: 'Pedidos', format: fmt.inteiro, axis: fmt.inteiro },
  entregues: { label: 'Entregas', format: fmt.inteiro, axis: fmt.inteiro },
}

export function TrendChart({ data, totais }: { data: PontoSerie[]; totais: Record<Metrica, number> }) {
  const [metrica, setMetrica] = useState<Metrica>('receita')
  const conf = METRICAS[metrica]
  const gradId = useId().replace(/:/g, '')
  const tickInterval = data.length > 31 ? Math.ceil(data.length / 8) - 1 : data.length > 14 ? 3 : 0

  const axisProps = {
    stroke: 'var(--chart-axis)',
    fontSize: 11,
    tickLine: false,
    axisLine: false,
  } as const

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line" role="tablist" aria-label="Métrica do gráfico">
        {(Object.keys(METRICAS) as Metrica[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={m === metrica}
            onClick={() => setMetrica(m)}
            className={cn(
              'relative px-3 py-2.5 text-left transition-colors sm:px-4',
              m === metrica ? 'bg-surface' : 'bg-surface-2 hover:bg-surface'
            )}
          >
            {m === metrica && <span className="absolute inset-x-0 top-0 h-0.5 bg-chart-1" aria-hidden="true" />}
            <span className="block text-xs text-fg-3">{METRICAS[m].label}</span>
            <span className="mt-0.5 block truncate text-base font-semibold tabular text-fg sm:text-lg">{METRICAS[m].format(totais[m])}</span>
          </button>
        ))}
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {metrica === 'receita' ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="data" tickFormatter={diaCurto} interval={tickInterval} {...axisProps} dy={6} />
              <YAxis tickFormatter={conf.axis} width={64} {...axisProps} />
              <Tooltip
                cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      title={diaLongo(String(label))}
                      rows={[{ label: 'Receita', value: fmt.moeda(Number(payload[0].value)), color: 'var(--chart-1)' }]}
                    />
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill={`url(#${gradId})`}
                activeDot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
                dot={false}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="data" tickFormatter={diaCurto} interval={tickInterval} {...axisProps} dy={6} />
              <YAxis tickFormatter={conf.axis} allowDecimals={false} width={40} {...axisProps} />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as PontoSerie
                  const rows = metrica === 'pedidos'
                    ? [
                        { label: 'Pedidos', value: fmt.inteiro(p.pedidos), color: 'var(--chart-1)' },
                        { label: 'Cancelados', value: fmt.inteiro(p.cancelados) },
                      ]
                    : [{ label: 'Entregas', value: fmt.inteiro(p.entregues), color: 'var(--chart-1)' }]
                  return <TooltipBox title={diaLongo(String(label))} rows={rows} />
                }}
              />
              <Bar dataKey={metrica} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Barras horizontais */

export function BarList({
  items, format = fmt.inteiro, emptyLabel = 'Sem dados no período', secondary,
}: {
  items: { key: string; label: ReactNode; value: number; detail?: string }[]
  format?: (v: number) => string
  emptyLabel?: string
  secondary?: (key: string) => ReactNode
}) {
  const max = Math.max(...items.map((i) => i.value), 0)
  if (!max) return <p className="py-8 text-center text-[13px] text-fg-3">{emptyLabel}</p>
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.key} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-fg-2">{i.label}</span>
            <span className="shrink-0 tabular text-fg">
              <span className="font-medium">{format(i.value)}</span>
              {i.detail && <span className="ml-1.5 text-fg-3">{i.detail}</span>}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-2">
            <div
              className="h-2 rounded-full bg-chart-1 transition-[width] duration-500"
              style={{ width: `${Math.max((i.value / max) * 100, i.value ? 2 : 0)}%` }}
            />
          </div>
          {secondary?.(i.key)}
        </li>
      ))}
    </ul>
  )
}

/* ---------------------------------------------------------------- Barra empilhada */

export function StackedBar({ segments }: { segments: { key: string; label: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-2" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        {total > 0 && segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-[13px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            <span className="text-fg-3">{s.label}</span>
            <span className="font-medium tabular text-fg">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------------------------------------------------------- Mapa de calor */

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function DemandHeatmap({ matrix }: { matrix: number[][] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null)
  const max = Math.max(...matrix.flat(), 0)
  // Ordem de leitura de segunda a domingo
  const ordem = [1, 2, 3, 4, 5, 6, 0]
  const step = (v: number) => {
    if (!v || !max) return 'var(--seq-0)'
    const r = v / max
    return r > 0.8 ? 'var(--seq-5)' : r > 0.6 ? 'var(--seq-4)' : r > 0.4 ? 'var(--seq-3)' : r > 0.2 ? 'var(--seq-2)' : 'var(--seq-1)'
  }
  const totalHora = Array.from({ length: 24 }, (_, h) => matrix.reduce((a, row) => a + (row[h] ?? 0), 0))
  const pico = totalHora.indexOf(Math.max(...totalHora))
  const totalDia = matrix.map((r) => r.reduce((a, b) => a + b, 0))
  const diaPico = totalDia.indexOf(Math.max(...totalDia))

  if (!max) return <p className="py-10 text-center text-[13px] text-fg-3">Sem pedidos no período</p>

  return (
    <div>
      <div className="overflow-x-auto scrollbar-none">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-[3px]">
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center text-[10px] tabular text-fg-3">{h % 3 === 0 ? `${h}h` : ''}</span>
            ))}
            {ordem.map((d) => (
              <div key={d} className="contents">
                <span className="flex items-center text-[11px] text-fg-3">{DIAS_SEMANA[d]}</span>
                {matrix[d].map((v, h) => (
                  <button
                    key={h}
                    type="button"
                    className={cn('aspect-square min-h-[14px] rounded-[3px] outline-offset-1', hover?.d === d && hover.h === h && 'outline outline-2 outline-fg')}
                    style={{ background: step(v) }}
                    onMouseEnter={() => setHover({ d, h })}
                    onFocus={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                    aria-label={`${DIAS_SEMANA_LONGO[d]}, ${h}h: ${v} pedidos`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <p className="text-fg-3" aria-live="polite">
          {hover ? (
            <>
              <span className="font-medium text-fg">{DIAS_SEMANA_LONGO[hover.d]}, {hover.h}h–{hover.h + 1}h</span>
              {' · '}{matrix[hover.d][hover.h]} pedidos
            </>
          ) : (
            <>
              Pico às <span className="font-medium text-fg">{pico}h</span>; dia mais movimentado:{' '}
              <span className="font-medium text-fg">{DIAS_SEMANA_LONGO[diaPico].toLowerCase()}</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-3">
          menos
          {['var(--seq-0)', 'var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)'].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />
          ))}
          mais
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Ganhos diários */

export function DailyBars({ data, label = 'Valor' }: { data: { data: string; valor: number; entregas?: number }[]; label?: string }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="data" tickFormatter={diaCurto} interval={1} stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} dy={6} />
          <YAxis tickFormatter={fmt.moedaCompacta} width={56} stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload, label: l }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as { valor: number; entregas?: number }
              const rows = [{ label, value: fmt.moeda(p.valor), color: 'var(--chart-1)' }]
              if (typeof p.entregas === 'number') rows.push({ label: 'Entregas', value: fmt.inteiro(p.entregas), color: '' })
              return <TooltipBox title={diaLongo(String(l))} rows={rows.map((r) => ({ ...r, color: r.color || undefined }))} />
            }}
          />
          <Bar dataKey="valor" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
