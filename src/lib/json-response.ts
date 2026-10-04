import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

// Mantém o contrato JSON numérico existente. Precisão decimal é preservada no
// banco/cálculos; a conversão ocorre somente ao entregar os dados à interface.
export function serializeApi(value: unknown): unknown {
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serializeApi)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeApi(item)]))
  }
  return value
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(serializeApi(body), init)
}
