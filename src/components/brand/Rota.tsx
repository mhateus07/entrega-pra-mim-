'use client'

import { useNaTela } from '@/hooks/useNaTela'
import { cn } from '@/utils/cn'

interface Ponto { x: number; y: number }

/**
 * A rota da marca: anel (coleta) → linha → ponto cheio (entrega).
 * Desenha-se ao entrar na tela e o ponto pousa no fim, como um carimbo.
 */
export default function Rota({
  d, inicio, fim, viewBox, className, espessura = 10, cor = 'var(--fg)', duracao = 1.4, atraso = 0, trecho, fundo = 'var(--surface)',
}: {
  d: string
  inicio: Ponto
  fim: Ponto
  viewBox: string
  className?: string
  espessura?: number
  cor?: string
  duracao?: number
  atraso?: number
  /** Trecho pontilhado depois do último ponto percorrido (rota ainda por fazer) */
  trecho?: string
  /** Cor de fundo atrás do desenho: o anel de coleta é vazado */
  fundo?: string
}) {
  const [ref, visivel] = useNaTela<SVGSVGElement>()
  const estilo = { '--duracao-rota': `${duracao}s`, '--atraso-rota': `${atraso}s`, '--atraso-pouso': `${atraso + duracao * 0.92}s` } as React.CSSProperties
  return (
    <svg ref={ref} viewBox={viewBox} aria-hidden="true" className={cn('overflow-visible', className)} data-visivel={visivel ? 'true' : 'false'} style={estilo}>
      {trecho && <path d={trecho} fill="none" stroke="var(--fg-3)" strokeWidth={espessura} strokeLinecap="round" strokeDasharray={`1 ${espessura * 2.2}`} />}
      <path d={d} pathLength={1} className="rota-traco" fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={inicio.x} cy={inicio.y} r={espessura * 1.5} fill={fundo} stroke={cor} strokeWidth={espessura * 0.85} />
      <circle cx={fim.x} cy={fim.y} r={espessura * 2} fill="var(--brand-mark)" className="pouso" />
    </svg>
  )
}
