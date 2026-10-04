import { Prisma } from '@prisma/client'
import { CONFIG_PAGAMENTO } from './pagamentos'

export function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
}

export function dividirPagamento(total: Prisma.Decimal.Value) {
  const valor = money(total)
  const taxaPlataforma = money(valor.mul(String(CONFIG_PAGAMENTO.taxaPlataforma)))
  return { valor, taxaPlataforma, valorMotoboy: valor.minus(taxaPlataforma) }
}
