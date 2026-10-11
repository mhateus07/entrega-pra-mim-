'use client'

import { useNaTela } from '@/hooks/useNaTela'
import { cn } from '@/utils/cn'

/**
 * Número que roda como odômetro/taxímetro quando entra na tela.
 * Cada dígito é um rolo 0–9; pontuação e símbolos ficam parados.
 */
export default function Odometro({ valor, className, atraso = 0 }: { valor: string; className?: string; atraso?: number }) {
  const [ref, visivel] = useNaTela<HTMLSpanElement>()
  let ordem = 0
  return (
    <span ref={ref} className={cn('inline-flex items-start font-mono leading-none tabular', className)} aria-label={valor}>
      {[...valor].map((c, i) => {
        if (!/\d/.test(c)) return <span key={i} aria-hidden="true" className="inline-block h-[1em] leading-none">{c}</span>
        const digito = Number(c)
        const indice = ordem++
        return (
          <span key={i} aria-hidden="true" className="relative inline-block h-[1em] overflow-hidden leading-none" style={{ width: '0.62em' }}>
            <span
              className="absolute inset-x-0 top-0 flex flex-col"
              style={{
                transform: `translateY(-${visivel ? digito + 10 : 0}em)`,
                transition: `transform ${1.1 + indice * 0.12}s cubic-bezier(0.2, 0.8, 0.2, 1) ${atraso + indice * 0.05}s`,
              }}
            >
              {Array.from({ length: 20 }, (_, n) => <span key={n} className="h-[1em] leading-none">{n % 10}</span>)}
            </span>
          </span>
        )
      })}
    </span>
  )
}
