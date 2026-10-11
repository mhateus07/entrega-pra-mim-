import { Prisma } from '@prisma/client'

export function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
}

// A taxa vem das configurações da central (padrão 0: a plataforma não tira comissão)
export function dividirPagamento(total: Prisma.Decimal.Value, taxa: Prisma.Decimal.Value = 0) {
  const valor = money(total)
  const taxaPlataforma = money(valor.mul(new Prisma.Decimal(taxa)))
  return { valor, taxaPlataforma, valorMotoboy: valor.minus(taxaPlataforma) }
}
