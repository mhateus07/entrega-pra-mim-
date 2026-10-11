'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'
import ContagemOferta from '@/components/brand/ContagemOferta'

// Uma corrida de verdade, do início ao fim, em loop: é o que a central vê no painel.
// Rota pelas ruas do mapa estilizado: anel = coleta (Centro), ponto = entrega (São Mateus).
const ROTA = 'M44 196 H150 V128 H262 V56 H330'
const FASES = [
  { id: 'oferta', ms: 2600 },
  { id: 'aceito', ms: 1500 },
  { id: 'coletado', ms: 1300 },
  { id: 'entrega', ms: 3400 },
  { id: 'entregue', ms: 3000 },
] as const
type Fase = (typeof FASES)[number]['id']

const LINHA_DO_TEMPO: { fase: Fase; texto: string; hora: string }[] = [
  { fase: 'aceito', texto: 'Diego aceitou', hora: '14:02' },
  { fase: 'coletado', texto: 'Coletado na farmácia', hora: '14:10' },
  { fase: 'entrega', texto: 'Saiu para entrega', hora: '14:12' },
  { fase: 'entregue', texto: 'Entregue, com foto', hora: '14:21' },
]

const STATUS: Record<Fase, { texto: string; cls: string }> = {
  oferta: { texto: 'Oferecido a Diego', cls: 'bg-warning-soft text-warning' },
  aceito: { texto: 'Aceito', cls: 'bg-info-soft text-info' },
  coletado: { texto: 'Coletado', cls: 'bg-info-soft text-info' },
  entrega: { texto: 'Em entrega', cls: 'bg-brand-soft text-brand' },
  entregue: { texto: 'Entregue', cls: 'bg-success-soft text-success' },
}

function MapaRuas() {
  // Quarteirões no tom do papel, ruas brancas (como o mockup do rastreio)
  const colunas = [0, 70, 120, 180, 230, 290, 340]
  const linhas = [0, 70, 110, 150, 210]
  return (
    <g>
      <rect width="380" height="240" fill="var(--surface)" />
      {linhas.slice(0, -1).map((y, i) => colunas.slice(0, -1).map((x, j) => (
        <rect key={`${i}-${j}`} x={x + 8} y={y + 8} width={colunas[j + 1] - x - 16} height={linhas[i + 1] - y - 16} rx="3" fill="var(--surface-2)" />
      )))}
    </g>
  )
}

export default function DespachoAoVivo() {
  const [indice, setIndice] = useState(3)
  const [volta, setVolta] = useState(0)
  const [segundos, setSegundos] = useState(90)
  const [animar, setAnimar] = useState(false)

  useEffect(() => {
    // Sem animação para quem pediu menos movimento: fica no "em entrega"
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const inicio = setTimeout(() => { setAnimar(true); setIndice(0) }, 400)
    return () => clearTimeout(inicio)
  }, [])

  useEffect(() => {
    if (!animar) return
    const timer = setTimeout(() => {
      if (indice === FASES.length - 1) { setVolta((v) => v + 1); setIndice(0); setSegundos(90) } else setIndice(indice + 1)
    }, FASES[indice].ms)
    return () => clearTimeout(timer)
  }, [animar, indice])

  // Contagem da oferta correndo enquanto ninguém aceitou
  useEffect(() => {
    if (!animar || FASES[indice].id !== 'oferta') return
    const timer = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 600)
    return () => clearInterval(timer)
  }, [animar, indice])

  const fase = FASES[indice].id
  const ordem = (f: Fase) => FASES.findIndex((x) => x.id === f)
  const andando = fase === 'entrega'
  const chegou = fase === 'entregue'
  const progresso = chegou ? 1 : andando ? 1 : 0

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="rotulo text-fg-2">Painel ao vivo · Rápido JF</span>
          </div>
          <span className="font-mono text-xs text-fg-3">6 online</span>
        </div>

        {/* Mapa com a rota */}
        <div className="relative aspect-[380/240] bg-surface-2">
          <svg key={volta} viewBox="0 0 380 240" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <MapaRuas />
            <path d={ROTA} fill="none" stroke="var(--border-strong)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.5 12" />
            <path
              d={ROTA} pathLength={1} fill="none" stroke="var(--brand-mark)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="1" strokeDashoffset={1 - progresso}
              style={{ transition: andando ? 'stroke-dashoffset 3.2s cubic-bezier(0.45, 0, 0.2, 1)' : 'none' }}
            />
            <circle cx="44" cy="196" r="10" fill="var(--surface)" stroke="var(--fg)" strokeWidth="6" />
            <circle cx="330" cy="56" r="13" fill={chegou ? 'var(--brand-mark)' : 'var(--fg)'} style={{ transition: 'fill 0.2s' }} />
            {chegou && <path d="M323 56 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="carimbo-check" />}
            {/* Moto: parada na coleta até sair; depois percorre as ruas até a entrega */}
            {ordem(fase) >= ordem('aceito') && !chegou && (
              <g key={`moto-${fase}`}>
                <g transform={andando ? undefined : 'translate(44 196)'}>
                  {andando && (
                    <animateMotion dur="3.2s" fill="freeze" path={ROTA} calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.45 0 0.2 1" />
                  )}
                  <circle r="9" fill="var(--brand-mark)" className="gps-pulso" />
                  <circle r="8" fill="var(--brand-mark)" stroke="#fff" strokeWidth="3.5" />
                </g>
              </g>
            )}
          </svg>

          {chegou && (
            <div className="carimbo absolute right-[6%] top-[38%] rotate-[-7deg] rounded-md border-[3px] border-success px-2.5 py-1 text-success">
              <p className="rotulo leading-none">Entregue</p>
              <p className="font-mono text-[11px] leading-tight">14:21 · com foto</p>
            </div>
          )}
        </div>

        {/* Corrida */}
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="rotulo text-fg-3">Corrida #4821 · Farmácia Central</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] font-semibold text-fg">
                Centro
                <span className="flex items-center" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-fg" />
                  <span className="mx-0.5 w-6 border-t-2 border-dotted border-fg-3 sm:w-10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-mark" />
                </span>
                <span className="whitespace-nowrap">São Mateus</span>
              </p>
            </div>
            <p className="whitespace-nowrap font-mono text-lg font-medium tabular text-fg">R$ 14,00</p>
          </div>

          <div className="flex min-h-12 items-center justify-between gap-3">
            <span key={fase} className={cn('status-troca inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold', STATUS[fase].cls)}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {STATUS[fase].texto}
            </span>
            {fase === 'oferta' ? <ContagemOferta segundos={segundos} /> : (
              <span className="flex items-center gap-2 text-[13px] text-fg-2">
                Diego <span className="placa scale-90"><b>JF</b><span className="!text-[12px]">RTA-4E21</span></span>
              </span>
            )}
          </div>

          <ol className="space-y-1.5 border-t border-line pt-3 text-[13px]">
            {LINHA_DO_TEMPO.map((l) => {
              const feito = ordem(fase) >= ordem(l.fase)
              return (
                <li key={l.fase} className="flex items-center justify-between">
                  <span className={cn('flex items-center gap-2 transition-colors duration-300', feito ? 'text-fg' : 'text-fg-3')}>
                    <span className={cn('h-2 w-2 rounded-full border-2 transition-colors duration-300', feito ? 'border-brand-mark bg-brand-mark' : 'border-line-strong')} />
                    {l.texto}
                  </span>
                  <span className={cn('font-mono tabular transition-colors duration-300', feito ? 'text-fg-2' : 'text-fg-3')}>{feito ? l.hora : '--:--'}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
