// =============================================================================
// Cache chave/valor com expiração
// =============================================================================
// Usa o Redis quando REDIS_URL está configurado (compartilhado entre instâncias);
// sem ele, ou se o Redis falhar, guarda em memória no próprio processo.
// =============================================================================

import { getRedis } from './rate-limit'

const MAX_MEMORIA = 2000
const memoria = new Map<string, { valor: string; expiraEm: number }>()

export async function cacheGet<T>(chave: string): Promise<T | null> {
  const redis = getRedis()
  if (redis?.status === 'ready') {
    try {
      const valor = await redis.get(`cache:${chave}`)
      return valor === null ? null : JSON.parse(valor) as T
    } catch { /* cai para a memória */ }
  }
  const item = memoria.get(chave)
  if (!item) return null
  if (item.expiraEm < Date.now()) {
    memoria.delete(chave)
    return null
  }
  return JSON.parse(item.valor) as T
}

export async function cacheSet(chave: string, valor: unknown, ttlSegundos: number): Promise<void> {
  const texto = JSON.stringify(valor)
  const redis = getRedis()
  if (redis?.status === 'ready') {
    try {
      await redis.set(`cache:${chave}`, texto, 'EX', ttlSegundos)
      return
    } catch { /* cai para a memória */ }
  }
  // Limite simples: descarta a entrada mais antiga quando enche
  if (memoria.size >= MAX_MEMORIA) memoria.delete(memoria.keys().next().value as string)
  memoria.set(chave, { valor: texto, expiraEm: Date.now() + ttlSegundos * 1000 })
}
