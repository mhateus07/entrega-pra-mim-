// =============================================================================
// Direção da navegação, usada pelas transições entre telas
// =============================================================================
// A animação conta para onde a pessoa foi: entrar no sistema (cortina com a
// barra laranja do símbolo), avançar para um detalhe, voltar para a lista ou andar no menu.
// =============================================================================

export type Area = 'site' | 'acesso' | 'painel' | 'motoboy' | 'cliente' | 'rastreio' | 'outra'

export type Direcao =
  | 'entrar'
  | 'frente'
  | 'volta'
  | 'proximo-x'
  | 'anterior-x'
  | 'proximo-y'
  | 'anterior-y'
  | 'lado'

const APP: Area[] = ['painel', 'motoboy', 'cliente']

// Ordem dos menus: descer no menu lateral move a tela para cima; andar nas
// abas do motoboy e do cliente move para o lado.
const MENUS: { eixo: 'x' | 'y'; itens: string[] }[] = [
  {
    eixo: 'y',
    itens: [
      '/dashboard', '/dashboard/despacho', '/dashboard/pedidos', '/dashboard/motoboys', '/dashboard/clientes',
      '/dashboard/fechamento', '/dashboard/precos', '/dashboard/convites', '/dashboard/marca', '/dashboard/plataforma',
    ],
  },
  { eixo: 'x', itens: ['/motoboy', '/motoboy/ganhos', '/motoboy/historico'] },
  { eixo: 'x', itens: ['/cliente', '/cliente/nova-entrega'] },
]

const limpar = (caminho: string) => (caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho)
const partes = (caminho: string) => limpar(caminho).split('/').filter(Boolean)

export function areaDe(caminho: string): Area {
  const primeiro = partes(caminho)[0] ?? ''
  if (primeiro === '') return 'site'
  if (['login', 'registro', 'convite'].includes(primeiro)) return 'acesso'
  if (primeiro === 'dashboard') return 'painel'
  if (primeiro === 'motoboy' || primeiro === 'cliente') return primeiro
  if (primeiro === 'r' || primeiro === 'o') return 'rastreio'
  return 'outra'
}

/** Direção da navegação de `de` para `para`; `null` quando não houve troca de tela. */
export function direcaoNavegacao(de: string | null, para: string): Direcao | null {
  if (!de) return null
  const a = limpar(de), b = limpar(para)
  if (a === b) return null

  const areaA = areaDe(a), areaB = areaDe(b)
  if (areaA !== areaB) {
    if (APP.includes(areaB) && !APP.includes(areaA)) return 'entrar'
    if (areaA === 'site') return 'frente'
    if (areaB === 'site' || areaB === 'acesso') return 'volta'
    return 'lado'
  }

  for (const menu of MENUS) {
    const i = menu.itens.indexOf(a), j = menu.itens.indexOf(b)
    if (i >= 0 && j >= 0) return `${j > i ? 'proximo' : 'anterior'}-${menu.eixo}`
  }

  const profundidadeA = partes(a).length, profundidadeB = partes(b).length
  if (profundidadeB > profundidadeA) return 'frente'
  if (profundidadeB < profundidadeA) return 'volta'
  return 'lado'
}
