// Geometria das rotas do mapa da landing: distâncias em metros (aproximação plana,
// suficiente para um bairro) e cortes de linha por distância percorrida.

export type Ponto = [number, number] // [lng, lat]

const M_POR_GRAU_LAT = 111_320

function metros(a: Ponto, b: Ponto) {
  const kx = Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180)) * M_POR_GRAU_LAT
  return Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * M_POR_GRAU_LAT)
}

export interface Percurso { pontos: Ponto[]; acumulado: number[]; total: number }

export function percurso(pontos: Ponto[]): Percurso {
  const acumulado = [0]
  for (let i = 1; i < pontos.length; i++) acumulado.push(acumulado[i - 1] + metros(pontos[i - 1], pontos[i]))
  return { pontos, acumulado, total: acumulado[acumulado.length - 1] }
}

function indiceEm(p: Percurso, d: number) {
  // Busca binária pelo segmento que contém a distância d
  let lo = 0, hi = p.acumulado.length - 1
  while (hi - lo > 1) {
    const meio = (lo + hi) >> 1
    if (p.acumulado[meio] <= d) lo = meio
    else hi = meio
  }
  return lo
}

export function pontoEm(p: Percurso, distancia: number): Ponto {
  const d = Math.max(0, Math.min(p.total, distancia))
  const i = indiceEm(p, d)
  const a = p.pontos[i], b = p.pontos[Math.min(i + 1, p.pontos.length - 1)]
  const trecho = p.acumulado[i + 1] - p.acumulado[i] || 1
  const t = (d - p.acumulado[i]) / trecho
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

/** Trecho da rota entre duas distâncias (para o rastro e a parte já percorrida). */
export function trecho(p: Percurso, de: number, ate: number): Ponto[] {
  const a = Math.max(0, de), b = Math.min(p.total, ate)
  if (b - a < 0.5) return []
  const ia = indiceEm(p, a), ib = indiceEm(p, b)
  return [pontoEm(p, a), ...p.pontos.slice(ia + 1, ib + 1), pontoEm(p, b)]
}

/** Rumo (graus, 0 = norte) de um ponto para outro. */
export function rumo(a: Ponto, b: Ponto) {
  const kx = Math.cos(a[1] * (Math.PI / 180))
  return (Math.atan2((b[0] - a[0]) * kx, b[1] - a[1]) * 180) / Math.PI
}

/** Diferença angular no menor sentido, em (-180, 180]. */
export function difAngulo(de: number, para: number) {
  return ((((para - de) % 360) + 540) % 360) - 180
}
