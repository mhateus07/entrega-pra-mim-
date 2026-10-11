import { afterEach, describe, expect, it, vi } from 'vitest'
import { calcularPrecoComRegra, normalizarBairro, REGRA_PADRAO, type RegraPreco } from '@/lib/pricing'
import { situacaoEntregas, LIMITES_PLANO } from '@/lib/planos'

const regra: RegraPreco = {
  precoPorKm: 2.5, valorMinimo: 8,
  multiplicadores: { AGENDADA: 1, DOCUMENTOS: 1.2, EXPRESSA: 1.5 },
  bairros: { [normalizarBairro('São Mateus')]: 12 },
}

describe('preço por central', () => {
  it('calcula por km com multiplicador e respeita o valor mínimo', () => {
    expect(calcularPrecoComRegra(regra, 10, 'EXPRESSA').valorTotal).toBe(37.5)
    expect(calcularPrecoComRegra(regra, 1, 'AGENDADA')).toMatchObject({ valorBase: 2.5, valorTotal: 8 })
  })

  it('bairro de destino com preço fixo substitui o km e mantém o multiplicador', () => {
    const preco = calcularPrecoComRegra(regra, 30, 'DOCUMENTOS', '  sao   MATEUS ')
    expect(preco).toMatchObject({ valorBase: 12, multiplicador: 1.2, valorTotal: 14.4, precoFixoBairro: true })
    expect(calcularPrecoComRegra(regra, 30, 'DOCUMENTOS', 'Centro').precoFixoBairro).toBe(false)
  })

  it('regra padrão reproduz a tabela global antiga (R$ 3/km)', () => {
    expect(calcularPrecoComRegra(REGRA_PADRAO, 4, 'EXPRESSA').valorTotal).toBe(18)
  })
})

describe('limites do plano', () => {
  it('aceita até 120% do limite, contando o excedente a R$ 0,10', () => {
    const limite = LIMITES_PLANO.ESSENCIAL.entregasMes
    expect(situacaoEntregas('ESSENCIAL', limite)).toMatchObject({ excedentes: 0, bloqueado: false })
    expect(situacaoEntregas('ESSENCIAL', limite + 50)).toMatchObject({ excedentes: 50, valorExcedente: 5, bloqueado: false })
    expect(situacaoEntregas('ESSENCIAL', Math.floor(limite * 1.2))).toMatchObject({ bloqueado: true })
  })

  it('valores dos planos combinados', () => {
    expect(LIMITES_PLANO).toMatchObject({
      ESSENCIAL: { motoboys: 5, entregasMes: 600 },
      CENTRAL: { motoboys: 20, entregasMes: 2500 },
      MARCA_PROPRIA: { motoboys: 50, entregasMes: 6000 },
    })
  })
})

describe('cache de rota e contagem de chamadas do Maps', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); vi.doUnmock('@/lib/uso') })

  it('rota repetida sai do cache e só a chamada real é contada na central', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'chave-teste')
    const contar = vi.fn()
    vi.doMock('@/lib/uso', () => ({ registrarChamadaMaps: contar }))
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ routes: [{ distanceMeters: 4200, duration: '600s' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { calcularRota } = await import('@/lib/google-maps')
    const origem = { latitude: -21.76 + Math.random() / 1000, longitude: -43.35 }
    const destino = { latitude: -21.78, longitude: -43.37 }
    const a = await calcularRota(origem, destino, { organizationId: 'org1' })
    const b = await calcularRota(origem, destino, { organizationId: 'org1' })
    expect(a?.distanciaKm).toBe(4.2)
    expect(b?.distanciaKm).toBe(4.2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(contar).toHaveBeenCalledTimes(1)
    expect(contar).toHaveBeenCalledWith('org1')
  })
})
