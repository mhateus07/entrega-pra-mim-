'use client'

import { useEffect, ViewTransition } from 'react'
import { usePathname } from 'next/navigation'
import { areaDe, direcaoNavegacao } from '@/lib/navegacao'

// =============================================================================
// Transições entre telas (View Transitions do React, ativadas pela navegação)
// =============================================================================
// Dois níveis, cada um com um nome fixo e a chave da rota, para o navegador
// animar a tela antiga saindo e a nova entrando:
// - Área (site, acesso, painel, motoboy, cliente): entrar no sistema passa a
//   faixa colete pela tela; sair do site para o acesso avança.
// - Tela, dentro da área: avançar para um detalhe, voltar para a lista ou
//   andar pelo menu. Menu lateral e cabeçalho ficam no layout, parados.
// A direção sai da rota anterior e da nova, então o botão voltar do navegador
// também anima no sentido certo. As classes estão em globals.css.
// O React só forma o par se a tela que sai também tiver classe (não "none"),
// por isso há sempre uma classe base. A tela leva o nome da área: telas de
// áreas diferentes nunca formam par, e a troca de área fica só com a cortina.
// =============================================================================

// Rota já exibida; atualizada depois de cada troca de tela
let rotaAnterior: string | null = null

export function TransicaoArea({ children }: { children: React.ReactNode }) {
  const rota = usePathname()
  const area = areaDe(rota)
  const mudouArea = rotaAnterior !== null && areaDe(rotaAnterior) !== area
  const direcao = mudouArea ? direcaoNavegacao(rotaAnterior, rota) : null

  useEffect(() => { rotaAnterior = rota }, [rota])

  return (
    <ViewTransition key={area} name="area" share={direcao ? `area-${direcao}` : 'area'} default="none">
      <div>{children}</div>
    </ViewTransition>
  )
}

export function TransicaoTela({ children, className }: { children: React.ReactNode; className?: string }) {
  const rota = usePathname()
  const direcao = direcaoNavegacao(rotaAnterior, rota)

  return (
    <ViewTransition key={rota} name={`tela-${areaDe(rota)}`} share={direcao ? `tela-${direcao}` : 'tela'} default="none">
      <div className={className}>{children}</div>
    </ViewTransition>
  )
}

/** Elemento que desliza de um lugar para outro quando a tela troca (destaque do menu ou da aba). */
export function Fixo({ nome, classe, children }: { nome: string; classe: string; children: React.ReactNode }) {
  return <ViewTransition name={nome} share={classe} default="none">{children}</ViewTransition>
}
