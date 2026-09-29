import { describe, expect, it } from 'vitest'
import { Prisma } from '@prisma/client'
import { money, dividirPagamento } from '@/lib/money'
import { jsonResponse } from '@/lib/json-response'
import { parsePagination, paginationMeta } from '@/lib/pagination'

describe('valores monetários e contrato da API', () => {
  it('arredonda centavos e mantém a soma exata do repasse com a comissão', () => {
    expect(money('1.005').toFixed(2)).toBe('1.01')
    for (const total of ['0.10', '0.30', '19.99', '33.33', '100.00']) {
      const split = dividirPagamento(total)
      expect(split.valorMotoboy.plus(split.taxaPlataforma).equals(total)).toBe(true)
    }
    const split = dividirPagamento('19.99')
    expect(split.taxaPlataforma.toFixed(2)).toBe('3.00')
    expect(split.valorMotoboy.toFixed(2)).toBe('16.99')
  })
  it('retorna números JSON inclusive em relações e agregações', async () => {
    const response = jsonResponse({ data: [{ valor: new Prisma.Decimal('19.99'),
      pagamento: { valorMotoboy: new Prisma.Decimal('16.99') }, createdAt: new Date('2026-01-01T00:00:00Z') }],
      _sum: { valor: new Prisma.Decimal('0.30') }, absent: null })
    expect(await response.json()).toEqual({ data: [{ valor: 19.99, pagamento: { valorMotoboy: 16.99 },
      createdAt: '2026-01-01T00:00:00.000Z' }], _sum: { valor: 0.3 }, absent: null })
  })
})

describe('limites de paginação', () => {
  it.each(['page=0', 'page=-1', 'page=1.5', 'page=NaN', 'page=10001', 'limit=0', 'limit=101', 'limit=Infinity'])('rejeita %s', query => {
    expect(() => parsePagination(new URLSearchParams(query))).toThrow('Paginação inválida')
  })
  it('calcula offset e mantém uma página navegável para lista vazia', () => {
    expect(parsePagination(new URLSearchParams('page=3&limit=20'))).toMatchObject({ skip: 40, take: 20 })
    expect(paginationMeta(1, 20, 0).totalPages).toBe(1)
    expect(paginationMeta(1, 20, 21).totalPages).toBe(2)
  })
})
