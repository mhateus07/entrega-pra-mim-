import { describe, expect, it } from 'vitest'
import { Prisma } from '@prisma/client'
import { csvMotoboys, gerarCsv, inicioDoDia, porCliente, porMotoboy, type PedidoFechamento } from '@/lib/fechamento'

const D = (v: string) => new Prisma.Decimal(v)
const pedido = (p: Partial<PedidoFechamento>): PedidoFechamento => ({
  motoboyId: 'm1', motoboyNome: 'Ana', clienteId: 'c1', clienteNome: 'Farmácia', distanciaKm: 2, valorTotal: D('10.10'), pagamento: null, ...p,
})

describe('fechamento', () => {
  it('por motoboy: soma exata, repasse e acerto com o dinheiro recebido em mãos', () => {
    const linhas = porMotoboy([
      pedido({ valorTotal: D('10.10'), pagamento: { metodo: 'DINHEIRO', status: 'APROVADO', valor: D('10.10') } }),
      pedido({ valorTotal: D('20.20'), distanciaKm: 3.33 }),
      pedido({ valorTotal: D('0.10'), pagamento: { metodo: 'PIX', status: 'APROVADO', valor: D('0.10') } }),
      pedido({ motoboyId: 'm2', motoboyNome: 'Bruno', valorTotal: D('5.00') }),
      pedido({ motoboyId: null, motoboyNome: null }),
    ], '0.7')
    expect(linhas[0]).toEqual({ motoboyId: 'm1', nome: 'Ana', corridas: 3, km: 7.3, valorCorridas: 30.4, repasse: 21.28, dinheiroRecebido: 10.1, saldoAcerto: 11.18 })
    expect(linhas[1]).toMatchObject({ nome: 'Bruno', repasse: 3.5, saldoAcerto: 3.5 })
  })

  it('motoboy que recebeu mais em dinheiro do que o repasse fica com saldo negativo', () => {
    const [linha] = porMotoboy([pedido({ valorTotal: D('100'), pagamento: { metodo: 'DINHEIRO', status: 'APROVADO', valor: D('100') } })], '0.7')
    expect(linha.saldoAcerto).toBe(-30)
  })

  it('por cliente: valor total, já pago e a cobrar', () => {
    const [linha] = porCliente([
      pedido({ valorTotal: D('30.00'), pagamento: { metodo: 'DINHEIRO', status: 'APROVADO', valor: D('30.00') } }),
      pedido({ valorTotal: D('12.50'), pagamento: { metodo: 'DINHEIRO', status: 'PENDENTE', valor: D('12.50') } }),
      pedido({ valorTotal: D('7.25') }),
    ])
    expect(linha).toMatchObject({ corridas: 3, valorTotal: 49.75, pago: 30, aCobrar: 19.75 })
  })

  it('CSV para Excel: BOM, ponto e vírgula, vírgula decimal e proteção contra fórmula', () => {
    const csv = gerarCsv(['Nome', 'Valor'], [['=HYPERLINK("x")', 12.5], ['Loja; Centro', 3]])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain(`"'=HYPERLINK(""x"")";12,50`)
    expect(csv).toContain('"Loja; Centro";3,00')
    expect(csvMotoboys([]).split('\r\n')[0]).toContain('Saldo do acerto')
  })

  it('o dia começa à meia-noite no fuso da central', () => {
    expect(inicioDoDia('2026-10-11', 'America/Sao_Paulo').toISOString()).toBe('2026-10-11T03:00:00.000Z')
    expect(inicioDoDia('2026-10-11', 'UTC').toISOString()).toBe('2026-10-11T00:00:00.000Z')
  })
})
