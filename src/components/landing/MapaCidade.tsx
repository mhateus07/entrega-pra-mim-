'use client'

import { memo } from 'react'

// =============================================================================
// Cidade ilustrada para o painel ao vivo do hero
// =============================================================================
// Inspirada no centro de Juiz de Fora (sem pretender ser cartografia exata):
// Av. Barão do Rio Branco cortando de norte a sul, Av. Getúlio Vargas, Rua
// Halfeld, Parque Halfeld, Rio Paraibuna com pontes e São Mateus ao sul.
// O "mundo" tem 760×480; o painel mostra uma janela 380×240 que a câmera move.
// =============================================================================

export const MUNDO = { w: 760, h: 480 }
export const JANELA = { w: 380, h: 240 }

const XS = [0, 40, 130, 210, 300, 380, 470, 560, 720, 760]
const YS = [0, 30, 110, 180, 260, 330, 410, 460, 480]
const AVENIDA_X = 300 // Av. Barão do Rio Branco
const AVENIDA_Y = 180 // Av. Getúlio Vargas
const meia = (largura: boolean) => (largura ? 9 : 4.5)

export const COLETA = { x: 130, y: 146 }
export const DESTINO = { x: 522, y: 410 }
export const BASE_MOTOBOY = { x: 130, y: 296 }
// Coleta (Centro) → Getúlio Vargas → Rio Branco → São Mateus
export const ROTA = 'M130 146 V180 H300 V330 H470 V410 H522'
export const ROTA_ATE_COLETA = 'M130 296 V146'

// Rotas dos outros motoboys online (laços pelas ruas)
const FROTA = [
  { d: 'M40 30 H380 V110 H210 V260 H40 Z', dur: 26 },
  { d: 'M470 30 V260 H380 V460 H560 V110 Z', dur: 31 },
  { d: 'M210 330 H470 V460 H130 V410 H210 Z', dur: 22 },
  { d: 'M300 30 V110 H560 V30 Z', dur: 18 },
  { d: 'M40 330 H130 V460 H40 Z', dur: 15 },
]

// Pseudoaleatório determinístico só com aritmética inteira (mulberry32): o mesmo
// desenho no servidor e no navegador. Math.sin difere nas últimas casas entre
// Node e Chrome e quebrava a hidratação.
function semente(n: number) {
  let t = (n * 2654435761 + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const r2 = (v: number) => Math.round(v * 100) / 100

interface Quadra { x: number; y: number; w: number; h: number; parque: boolean; atraso: number; predios: { x: number; y: number; w: number; h: number; tom: number }[] }

function gerarQuadras(): Quadra[] {
  const quadras: Quadra[] = []
  for (let i = 0; i < XS.length - 1; i++) {
    for (let j = 0; j < YS.length - 1; j++) {
      const x0 = XS[i] + (i === 0 ? 0 : meia(XS[i] === AVENIDA_X)) + 2
      const x1 = XS[i + 1] - (i === XS.length - 2 ? 0 : meia(XS[i + 1] === AVENIDA_X)) - 2
      const y0 = YS[j] + (j === 0 ? 0 : meia(YS[j] === AVENIDA_Y)) + 2
      const y1 = YS[j + 1] - (j === YS.length - 2 ? 0 : meia(YS[j + 1] === AVENIDA_Y)) - 2
      const w = x1 - x0, h = y1 - y0
      if (w < 8 || h < 8) continue
      const parque = XS[i] === 210 && YS[j] === 110
      const predios: Quadra['predios'] = []
      if (!parque) {
        // Lotes: divide a quadra em colunas e linhas e deixa alguns vazios
        const cols = Math.max(1, Math.round(w / 34)), lins = Math.max(1, Math.round(h / 30))
        for (let c = 0; c < cols; c++) {
          for (let l = 0; l < lins; l++) {
            const r = semente(i * 97 + j * 31 + c * 7 + l * 3)
            if (r < 0.14) continue
            const lw = w / cols, lh = h / lins
            predios.push({ x: r2(x0 + c * lw + 2), y: r2(y0 + l * lh + 2), w: r2(lw - 4 - (r > 0.7 ? 5 : 0)), h: r2(lh - 4 - (r < 0.35 ? 4 : 0)), tom: r > 0.55 ? 2 : 1 })
          }
        }
      }
      const cx = x0 + w / 2 - MUNDO.w / 2, cy = y0 + h / 2 - MUNDO.h / 2
      quadras.push({ x: x0, y: y0, w, h, parque, predios, atraso: r2(Math.hypot(cx, cy) / 900) })
    }
  }
  return quadras
}

const QUADRAS = gerarQuadras()
const ARVORES = Array.from({ length: 14 }, (_, k) => ({
  x: r2(216 + semente(k + 1) * 74), y: r2(117 + semente(k + 50) * 54), r: r2(3.5 + semente(k + 90) * 3),
}))

function Rotulo({ x, y, texto, girar, tamanho = 7.5, peso = 700 }: { x: number; y: number; texto: string; girar?: number; tamanho?: number; peso?: number }) {
  return (
    <text x={x} y={y} transform={girar ? `rotate(${girar} ${x} ${y})` : undefined} fill="var(--mapa-texto)"
      fontSize={tamanho} fontWeight={peso} letterSpacing="0.12em" style={{ fontStretch: '80%', textTransform: 'uppercase' }} textAnchor="middle">
      {texto}
    </text>
  )
}

/** Base estática da cidade (memo: não redesenha a cada fase). */
export const CidadeBase = memo(function CidadeBase({ animarCarga }: { animarCarga: boolean }) {
  return (
    <g>
      <rect width={MUNDO.w} height={MUNDO.h} fill="var(--mapa-terra)" />
      {/* Ruas: avenidas mais largas, com faixa central */}
      {XS.slice(1, -1).map((x) => (
        <rect key={`v${x}`} x={x - meia(x === AVENIDA_X)} y={0} width={meia(x === AVENIDA_X) * 2} height={MUNDO.h} fill={x === AVENIDA_X ? 'var(--mapa-avenida)' : 'var(--mapa-rua)'} />
      ))}
      {YS.slice(1, -1).map((y) => (
        <rect key={`h${y}`} x={0} y={y - meia(y === AVENIDA_Y)} width={MUNDO.w} height={meia(y === AVENIDA_Y) * 2} fill={y === AVENIDA_Y ? 'var(--mapa-avenida)' : 'var(--mapa-rua)'} />
      ))}
      <line x1={AVENIDA_X} y1={0} x2={AVENIDA_X} y2={MUNDO.h} stroke="var(--mapa-faixa)" strokeWidth="1.2" strokeDasharray="6 6" />
      <line x1={0} y1={AVENIDA_Y} x2={MUNDO.w} y2={AVENIDA_Y} stroke="var(--mapa-faixa)" strokeWidth="1.2" strokeDasharray="6 6" />

      {/* Quadras com prédios; o mapa "carrega" do centro para fora */}
      {QUADRAS.map((q, k) => (
        <g key={k} className={animarCarga ? 'mapa-quadra' : undefined} style={animarCarga ? ({ '--atraso-quadra': `${q.atraso}s`, transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties) : undefined}>
          <rect x={q.x} y={q.y} width={q.w} height={q.h} rx="3" fill={q.parque ? 'var(--mapa-parque)' : 'var(--mapa-quadra)'} />
          {q.predios.map((p, n) => (
            <rect key={n} x={p.x} y={p.y} width={Math.max(3, p.w)} height={Math.max(3, p.h)} rx="1.5" fill={p.tom === 2 ? 'var(--mapa-predio-2)' : 'var(--mapa-predio)'} />
          ))}
          {q.parque && ARVORES.map((a, n) => <circle key={n} cx={a.x} cy={a.y} r={a.r} fill="var(--mapa-arvore)" />)}
        </g>
      ))}

      {/* Rio Paraibuna, por cima das quadras, com as duas pontes */}
      <path d="M655 -20 C 612 110, 700 230, 636 320 S 598 450, 640 520" fill="none" stroke="var(--mapa-agua)" strokeWidth="54" strokeLinecap="round" />
      <path d="M655 -20 C 612 110, 700 230, 636 320 S 598 450, 640 520" fill="none" stroke="var(--mapa-agua-2)" strokeWidth="2" strokeDasharray="10 14" opacity="0.8" />
      <rect x={560} y={AVENIDA_Y - meia(true)} width={160} height={meia(true) * 2} fill="var(--mapa-avenida)" />
      <rect x={560} y={410 - 4.5} width={160} height={9} fill="var(--mapa-rua)" />

      <Rotulo x={AVENIDA_X - 16} y={300} texto="Av. Barão do Rio Branco" girar={-90} />
      <Rotulo x={470} y={AVENIDA_Y - 13} texto="Av. Getúlio Vargas" />
      <Rotulo x={84} y={102} texto="R. Halfeld" />
      <Rotulo x={255} y={148} texto="Parque Halfeld" tamanho={6.5} />
      <Rotulo x={668} y={300} texto="Rio Paraibuna" girar={-68} tamanho={7} />
      <Rotulo x={86} y={66} texto="Centro" tamanho={13} peso={800} />
      <Rotulo x={430} y={448} texto="São Mateus" tamanho={13} peso={800} />
    </g>
  )
})

/** Outros motoboys online circulando (pontos neutros). */
export function Frota({ animar }: { animar: boolean }) {
  return (
    <g aria-hidden="true">
      {FROTA.map((f, k) => (
        <g key={k} transform={animar ? undefined : `translate(${f.d.split(' ')[0].slice(1)} ${f.d.split(' ')[1]})`}>
          {animar && <animateMotion dur={`${f.dur}s`} repeatCount="indefinite" path={f.d} begin={`-${k * 4}s`} />}
          <circle r="7" fill="var(--mapa-frota)" opacity="0.18" />
          <circle r="4.2" fill="var(--mapa-frota)" stroke="var(--mapa-terra)" strokeWidth="1.6" />
        </g>
      ))}
    </g>
  )
}

/** Transformação da câmera para centralizar um ponto do mundo com zoom `s`, sem sair das bordas. */
export function camera(p: { x: number; y: number } | null, s: number) {
  if (!p) return { s: JANELA.w / MUNDO.w, tx: 0, ty: 0 }
  const tx = Math.min(0, Math.max(JANELA.w - s * MUNDO.w, JANELA.w / 2 - s * p.x))
  const ty = Math.min(0, Math.max(JANELA.h - s * MUNDO.h, JANELA.h / 2 - s * p.y))
  return { s, tx, ty }
}
