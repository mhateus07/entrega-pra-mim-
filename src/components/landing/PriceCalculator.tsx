'use client'

import { useState } from 'react'
import { calcularPreco, estimarTempo, formatarMoeda, formatarTempo, NOMES_SERVICO } from '@/lib/pricing'
import { cn } from '@/utils/cn'

const TIPOS = ['AGENDADA', 'DOCUMENTOS', 'EXPRESSA'] as const

export default function PriceCalculator() {
  const [km, setKm] = useState(6)
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>('EXPRESSA')
  const preco = calcularPreco(km, tipo)

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
      <div className="flex items-baseline justify-between">
        <label htmlFor="km" className="text-sm font-medium text-fg">Distância do trajeto</label>
        <span className="text-sm font-semibold tabular text-fg">{km} km</span>
      </div>
      <input
        id="km"
        type="range"
        min={1}
        max={30}
        step={1}
        value={km}
        onChange={(e) => setKm(Number(e.target.value))}
        className="mt-3 w-full accent-[var(--brand)]"
      />
      <div className="mt-1 flex justify-between text-xs tabular text-fg-3">
        <span>1 km</span>
        <span>30 km</span>
      </div>

      <div className="mt-6 grid gap-2" role="radiogroup" aria-label="Tipo de serviço">
        {TIPOS.map((t) => {
          const v = calcularPreco(km, t).valorTotal
          const ativo = t === tipo
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => setTipo(t)}
              className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                ativo ? 'border-fg ring-1 ring-fg' : 'border-line-strong hover:border-fg-3'
              )}
            >
              <span className="flex items-center gap-3">
                <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', ativo ? 'border-fg' : 'border-line-strong')}>
                  {ativo && <span className="h-2 w-2 rounded-full bg-fg" />}
                </span>
                <span className="font-medium text-fg">{NOMES_SERVICO[t]}</span>
              </span>
              <span className="tabular text-fg-2">{formatarMoeda(v)}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-line pt-5">
        <div>
          <p className="text-[13px] text-fg-3">Valor estimado</p>
          <p className="text-3xl font-semibold tracking-tight tabular text-fg">{formatarMoeda(preco.valorTotal)}</p>
        </div>
        <p className="text-right text-[13px] text-fg-3">
          ~{formatarTempo(estimarTempo(km))}
          <br />de trajeto
        </p>
      </div>
      <p className="mt-4 text-xs text-fg-3">
        Estimativa. O valor final é calculado pela rota real entre os endereços de coleta e entrega.
      </p>
    </div>
  )
}
