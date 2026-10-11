'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

const PASSOS = [
  { rotulo: 'Coleta', titulo: 'Cadastre a equipe e os clientes', texto: 'Motoboys e empresas entram por um link de convite que você manda no WhatsApp. Cada um com o próprio acesso, preso à sua central.' },
  { rotulo: 'Despacho', titulo: 'O pedido chega e o sistema despacha', texto: 'A empresa abre o pedido sozinha ou sua equipe lança. A corrida vai ao motoboy mais perto, com 90 segundos para aceitar. Não aceitou? Passa ao próximo.' },
  { rotulo: 'Entrega', titulo: 'Rastreio, foto e fechamento', texto: 'O destinatário acompanha por um link com a sua marca. A entrega fecha com foto. No fim do dia você sabe quanto pagar e quanto cobrar.' },
]

// A rota percorre a seção conforme a página rola: o anel no primeiro passo,
// o ponto de entrega no último — cada parada acende quando a rota chega nela.
export default function ComoFunciona() {
  const ref = useRef<HTMLOListElement>(null)
  const [progresso, setProgresso] = useState(0)

  useEffect(() => {
    let quadro = 0
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      quadro = requestAnimationFrame(() => setProgresso(1))
      return () => cancelAnimationFrame(quadro)
    }
    const medir = () => {
      quadro = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const alvo = window.innerHeight * 0.6
      setProgresso(Math.max(0, Math.min(1, (alvo - r.top) / r.height)))
    }
    const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(medir) }
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    window.addEventListener('resize', aoRolar)
    return () => { window.removeEventListener('scroll', aoRolar); window.removeEventListener('resize', aoRolar); cancelAnimationFrame(quadro) }
  }, [])

  return (
    <ol ref={ref} className="relative mt-14 space-y-14 pl-14 sm:pl-20">
      {/* Trilho e rota */}
      <span aria-hidden="true" className="absolute bottom-3 left-[15px] top-3 w-[4px] rounded-full bg-[repeating-linear-gradient(var(--border-strong)_0_4px,transparent_4px_12px)] sm:left-[23px]" />
      <span
        aria-hidden="true"
        className="absolute left-[15px] top-3 w-[4px] origin-top rounded-full bg-fg sm:left-[23px]"
        style={{ height: 'calc(100% - 24px)', transform: `scaleY(${progresso})` }}
      />
      {PASSOS.map((p, i) => {
        const marco = i / (PASSOS.length - 1)
        const chegou = progresso >= marco - 0.02
        const ultimo = i === PASSOS.length - 1
        return (
          <li key={p.titulo} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                'absolute -left-14 top-0 flex h-[34px] w-[34px] items-center justify-center rounded-full transition-all duration-300 sm:-left-20 sm:h-[50px] sm:w-[50px]',
                ultimo
                  ? (chegou ? 'scale-100 bg-brand-mark' : 'scale-75 bg-surface-3')
                  : cn('border-[5px] bg-page', chegou ? 'border-fg' : 'border-line-strong'),
              )}
            >
              {ultimo && chegou && (
                <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6"><path d="M5 12.5 l4.5 4.5 L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="carimbo-check" /></svg>
              )}
            </span>
            <p className={cn('rotulo transition-colors duration-300', chegou ? 'text-brand' : 'text-fg-3')}>
              <span className="font-mono">0{i + 1}</span> · {p.rotulo}
            </p>
            <h3 className="titulo-display mt-2 text-[28px] text-fg sm:text-[34px]">{p.titulo}</h3>
            <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-fg-2">{p.texto}</p>
          </li>
        )
      })}
    </ol>
  )
}
