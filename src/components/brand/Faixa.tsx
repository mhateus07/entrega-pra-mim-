'use client'

import { useNaTela } from '@/hooks/useNaTela'
import { cn } from '@/utils/cn'

/**
 * Faixa colete (banda laranja com duas faixas refletivas). Ao entrar na tela,
 * um farol passa e as faixas refletem — uma vez, ou sempre com `reflexo="sempre"`.
 */
export default function Faixa({ className, reflexo = 'uma' }: { className?: string; reflexo?: 'uma' | 'sempre' | 'nao' }) {
  const [ref, visivel] = useNaTela<HTMLDivElement>()
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('faixa-colete h-[18px] w-full', className)}
      data-reflexo={reflexo !== 'nao' && visivel ? (reflexo === 'sempre' ? 'sempre' : '') : undefined}
    />
  )
}
