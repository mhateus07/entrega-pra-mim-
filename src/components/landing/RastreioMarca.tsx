'use client'

import { useState } from 'react'
import { cn } from '@/utils/cn'
import { LogoMark } from '@/components/brand/Logo'

// Mesmo link de rastreio, duas marcas: a do EPM (Essencial/Central) e a da central (Marca própria).
// A troca acontece só por variável de cor, como no produto.
const MARCAS = {
  epm: { nome: 'Entrega Pra Mim', cor: '#e2570f', suave: '#f2c3a8', rodape: ['Entrega feita por', 'Rápido JF Motofrete'] },
  central: { nome: 'Rápido JF Motofrete', cor: '#0f6b5c', suave: '#a9cfc7', rodape: ['tecnologia', 'Entrega Pra Mim'] },
} as const

export default function RastreioMarca() {
  const [marca, setMarca] = useState<keyof typeof MARCAS>('central')
  const m = MARCAS[marca]
  const passos = [['Pedido aceito', '14:02'], ['Coletado na loja', '14:10'], ['Saiu para entrega', '14:12'], ['Entregue, com foto', '--:--']]

  return (
    <div className="flex flex-col items-center gap-6">
      <div role="radiogroup" aria-label="Marca no rastreio" className="inline-flex rounded-[10px] border border-line bg-surface p-1">
        {(['epm', 'central'] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={marca === k} onClick={() => setMarca(k)}
            className={cn('h-9 rounded-lg px-4 text-sm font-semibold transition-colors', marca === k ? 'bg-fg text-page' : 'text-fg-2 hover:text-fg')}>
            {k === 'epm' ? 'Planos Essencial e Central' : 'Plano Marca própria'}
          </button>
        ))}
      </div>

      {/* Celular */}
      <div
        className="w-full max-w-[340px] rounded-[38px] border-[9px] border-[#141413] bg-white text-[#141413] shadow-pop"
        style={{ '--cor': m.cor, '--cor-suave': m.suave } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5 px-5 pb-3 pt-6">
          {marca === 'epm'
            ? <LogoMark className="h-7 w-7" />
            : <span className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[11px] font-bold text-white transition-colors duration-500" style={{ background: 'var(--cor)' }}>RJ</span>}
          <span key={marca} className="status-troca text-[15px] font-bold">{m.nome}</span>
        </div>
        <svg viewBox="0 0 320 170" className="block w-full bg-[#f1f0eb]" aria-hidden="true">
          {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => <rect key={`${r}${c}`} x={c * 66 + 6} y={r * 44 + 6} width="54" height="32" rx="3" fill="#e9e8e3" />))}
          <path d="M60 150 V108 H160 V64 L196 28 H260" fill="none" stroke="var(--cor-suave)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.5s' }} />
          <path d="M60 150 V108 H160 V82" fill="none" stroke="var(--cor)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.5s' }} />
          <circle cx="60" cy="150" r="9" fill="#fff" stroke="var(--cor)" strokeWidth="5" style={{ transition: 'stroke 0.5s' }} />
          <circle cx="160" cy="82" r="12" fill="var(--cor)" opacity="0.25" className="gps-pulso" style={{ transition: 'fill 0.5s' }} />
          <circle cx="160" cy="82" r="7" fill="var(--cor)" stroke="#fff" strokeWidth="3" style={{ transition: 'fill 0.5s' }} />
          <circle cx="262" cy="28" r="10" fill="#141413" />
        </svg>
        <div className="px-5 pb-5 pt-4">
          <p className="rotulo text-[#6f6d66]">Pedido #4821</p>
          <p className="titulo-display mt-1 text-[30px]">Saiu para entrega</p>
          <p className="mt-1 text-[14px] text-[#52514e]">Chega em <b className="text-[#141413]">~12 min</b> · São Mateus</p>
          <ol className="mt-4 space-y-2.5 text-[13px]">
            {passos.map(([t, h], i) => (
              <li key={t} className="flex items-center justify-between">
                <span className={cn('flex items-center gap-2', i === 3 && 'text-[#9a988f]')}>
                  <span className="h-2.5 w-2.5 rounded-full border-2 transition-colors duration-500" style={i < 3 ? { background: 'var(--cor)', borderColor: 'var(--cor)' } : { borderColor: '#cfccc4' }} />
                  {t}
                </span>
                <span className="font-mono text-[#6f6d66]">{h}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="border-t border-[#e4e2dc] px-5 py-3.5 text-[12px] text-[#6f6d66]">
          {m.rodape[0]} <b className="ml-1 text-[#141413]">{m.rodape[1]}</b>
        </div>
      </div>
    </div>
  )
}
