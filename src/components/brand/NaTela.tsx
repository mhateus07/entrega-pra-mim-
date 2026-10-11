'use client'

import { createElement, type ElementType, type HTMLAttributes, type ReactNode } from 'react'
import { useNaTela } from '@/hooks/useNaTela'

/**
 * Bloco que ganha data-visivel="true" ao entrar na tela. As animações da marca
 * (.chega, .rota-traco, .pouso, .regua) só rodam a partir daí, uma vez.
 */
export default function NaTela({ as = 'div', children, ...props }: { as?: ElementType; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  const [ref, visivel] = useNaTela<HTMLElement>()
  return createElement(as, { ...props, ref, 'data-visivel': visivel ? 'true' : 'false' }, children)
}
