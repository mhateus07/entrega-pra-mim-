import { OperacaoError } from './operacao-error'

export interface Pagination { page: number; pageSize: number; total: number; totalPages: number }

export function parsePagination(params: URLSearchParams) {
  const page = Number(params.get('page') ?? '1')
  const pageSize = Number(params.get('limit') ?? '20')
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new OperacaoError('Paginação inválida: page deve ser 1–10000 e limit deve ser 1–100', 400)
  }
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}
export function paginationMeta(page: number, pageSize: number, total: number): Pagination {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}
export function enumFilter<T extends string>(value: string | null, options: readonly T[]): T | undefined {
  if (value === null) return undefined
  if (!options.includes(value as T)) throw new OperacaoError('Filtro inválido', 400)
  return value as T
}
