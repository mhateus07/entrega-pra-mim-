import { describe, expect, it } from 'vitest'
import { areaDe, direcaoNavegacao } from '@/lib/navegacao'

describe('direção da navegação entre telas', () => {
  it('agrupa as rotas por área', () => {
    expect(areaDe('/')).toBe('site')
    expect(areaDe('/login')).toBe('acesso')
    expect(areaDe('/convite/abc')).toBe('acesso')
    expect(areaDe('/dashboard/pedidos/1')).toBe('painel')
    expect(areaDe('/motoboy/ganhos')).toBe('motoboy')
    expect(areaDe('/r/token')).toBe('rastreio')
  })

  it('sem rota anterior ou na mesma rota não anima', () => {
    expect(direcaoNavegacao(null, '/dashboard')).toBeNull()
    expect(direcaoNavegacao('/dashboard/', '/dashboard')).toBeNull()
  })

  it('entrar no sistema usa a cortina; sair do site avança; voltar ao site recua', () => {
    expect(direcaoNavegacao('/login', '/dashboard')).toBe('entrar')
    expect(direcaoNavegacao('/convite/x', '/motoboy')).toBe('entrar')
    expect(direcaoNavegacao('/', '/login')).toBe('frente')
    expect(direcaoNavegacao('/login', '/')).toBe('volta')
  })

  it('no menu lateral a direção segue a ordem dos itens, no eixo vertical', () => {
    expect(direcaoNavegacao('/dashboard', '/dashboard/pedidos')).toBe('proximo-y')
    expect(direcaoNavegacao('/dashboard/marca', '/dashboard/despacho')).toBe('anterior-y')
  })

  it('nas abas do motoboy e do cliente o movimento é lateral', () => {
    expect(direcaoNavegacao('/motoboy', '/motoboy/historico')).toBe('proximo-x')
    expect(direcaoNavegacao('/cliente/nova-entrega', '/cliente')).toBe('anterior-x')
  })

  it('detalhe avança e a lista volta', () => {
    expect(direcaoNavegacao('/dashboard/pedidos', '/dashboard/pedidos/abc')).toBe('frente')
    expect(direcaoNavegacao('/motoboy/pedido/abc', '/motoboy')).toBe('volta')
    expect(direcaoNavegacao('/login', '/registro')).toBe('lado')
  })
})
