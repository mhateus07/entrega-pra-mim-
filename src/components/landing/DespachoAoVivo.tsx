'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import ContagemOferta from '@/components/brand/ContagemOferta'
import { BASE_MOTOBOY, COLETA, CidadeBase, DESTINO, Frota, JANELA, ROTA, ROTA_ATE_COLETA, camera } from './MapaCidade'

// Uma corrida de verdade, do início ao fim, em loop — é o que a central vê no painel.
// A câmera abre na cidade, procura o motoboy, aproxima na coleta, segue a moto e afasta.
const FASES = [
  { id: 'busca', ms: 2200 },
  { id: 'oferta', ms: 2600 },
  { id: 'aceito', ms: 1900 },
  { id: 'coletado', ms: 1200 },
  { id: 'entrega', ms: 4800 },
  { id: 'entregue', ms: 3200 },
] as const
type Fase = (typeof FASES)[number]['id']
const DURACAO_ENTREGA = 4.6

const LINHA_DO_TEMPO: { fase: Fase; texto: string; hora: string }[] = [
  { fase: 'aceito', texto: 'Diego aceitou', hora: '14:02' },
  { fase: 'coletado', texto: 'Coletado na farmácia', hora: '14:10' },
  { fase: 'entrega', texto: 'Saiu para entrega', hora: '14:12' },
  { fase: 'entregue', texto: 'Entregue, com foto', hora: '14:21' },
]

const STATUS: Record<Fase, { texto: string; cls: string }> = {
  busca: { texto: 'Procurando motoboy', cls: 'bg-warning-soft text-warning' },
  oferta: { texto: 'Oferecido a Diego', cls: 'bg-warning-soft text-warning' },
  aceito: { texto: 'Indo para a coleta', cls: 'bg-info-soft text-info' },
  coletado: { texto: 'Coletado', cls: 'bg-info-soft text-info' },
  entrega: { texto: 'Em entrega', cls: 'bg-brand-soft text-brand' },
  entregue: { texto: 'Entregue', cls: 'bg-success-soft text-success' },
}

// Câmera fixa por fase; na entrega ela segue a moto quadro a quadro
const ZOOM_SEGUIR = 1.05
const CAMERA: Record<Fase, ReturnType<typeof camera>> = {
  busca: camera(null, 0),
  oferta: camera({ x: COLETA.x + 40, y: (COLETA.y + BASE_MOTOBOY.y) / 2 }, 0.95),
  aceito: camera({ x: COLETA.x + 40, y: (COLETA.y + BASE_MOTOBOY.y) / 2 }, 0.95),
  coletado: camera(COLETA, ZOOM_SEGUIR),
  entrega: camera(COLETA, ZOOM_SEGUIR),
  entregue: camera({ x: DESTINO.x - 50, y: DESTINO.y - 40 }, 1.1),
}

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Posição ao longo de um <path> durante `ms`, animada com requestAnimationFrame. */
function usePercurso(ref: React.RefObject<SVGPathElement | null>, ativo: boolean, ms: number) {
  const [estado, setEstado] = useState<{ p: number; x: number; y: number } | null>(null)
  useEffect(() => {
    const path = ref.current
    if (!ativo || !path) return
    const total = path.getTotalLength()
    let quadro = 0
    const inicio = performance.now()
    const passo = (agora: number) => {
      const p = suave(Math.min(1, (agora - inicio) / ms))
      const pt = path.getPointAtLength(p * total)
      setEstado({ p, x: pt.x, y: pt.y })
      if (p < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => { cancelAnimationFrame(quadro); setEstado(null) }
  }, [ref, ativo, ms])
  return estado
}

function Moto({ destaque, eta }: { destaque?: boolean; eta?: number | null }) {
  return (
    <>
      <circle r="13" fill="var(--brand-mark)" className="gps-pulso" />
      <circle r="8.5" fill={destaque ? 'var(--brand-mark)' : 'var(--mapa-frota)'} stroke="#fff" strokeWidth="3.5" />
      {eta != null && (
        <g transform="translate(14 -26)">
          <rect width="48" height="20" rx="6" fill="#141413" />
          <text x="24" y="14" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600" style={{ fontFamily: 'var(--font-plex-mono), monospace' }}>{eta} min</text>
        </g>
      )}
    </>
  )
}

function Etiqueta({ x, y, texto, escura }: { x: number; y: number; texto: string; escura?: boolean }) {
  const largura = texto.length * 6.2 + 16
  return (
    <g transform={`translate(${x - largura / 2} ${y})`}>
      <rect width={largura} height="19" rx="5" fill={escura ? '#141413' : 'var(--surface)'} stroke={escura ? 'none' : 'var(--border-strong)'} />
      <text x={largura / 2} y="13" textAnchor="middle" fontSize="10" fontWeight="700" fill={escura ? '#fff' : 'var(--fg)'}>{texto}</text>
    </g>
  )
}

export default function DespachoAoVivo() {
  const [indice, setIndice] = useState(4)
  const [volta, setVolta] = useState(0)
  const [segundos, setSegundos] = useState(90)
  const [animar, setAnimar] = useState(false)

  useEffect(() => {
    // Sem animação para quem pediu menos movimento: fica no "em entrega", parado
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const inicio = setTimeout(() => { setAnimar(true); setIndice(0) }, 900)
    return () => clearTimeout(inicio)
  }, [])

  useEffect(() => {
    if (!animar) return
    const timer = setTimeout(() => {
      if (indice === FASES.length - 1) { setVolta((v) => v + 1); setIndice(0); setSegundos(90) } else setIndice(indice + 1)
    }, FASES[indice].ms)
    return () => clearTimeout(timer)
  }, [animar, indice])

  const fase = FASES[indice].id

  // Contagem da oferta e minutos restantes da entrega
  useEffect(() => {
    if (!animar) return
    if (fase === 'oferta') {
      const t = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 450)
      return () => clearInterval(t)
    }
  }, [animar, fase])

  const ordem = (f: Fase) => FASES.findIndex((x) => x.id === f)
  const passou = (f: Fase) => indice >= ordem(f)
  const andando = fase === 'entrega'
  const chegou = fase === 'entregue'

  const rotaRef = useRef<SVGPathElement>(null)
  const ateColetaRef = useRef<SVGPathElement>(null)
  const indo = usePercurso(ateColetaRef, animar && fase === 'aceito', 1600)
  const entregando = usePercurso(rotaRef, animar && andando, DURACAO_ENTREGA * 1000)

  // Onde o Diego está agora
  const diego = andando
    ? (entregando ?? (animar ? COLETA : { x: 300, y: 260 }))
    : fase === 'aceito' ? (indo ?? BASE_MOTOBOY)
      : passou('coletado') ? COLETA : BASE_MOTOBOY
  const progresso = chegou ? 1 : andando ? (entregando?.p ?? (animar ? 0 : 0.55)) : 0
  const eta = Math.max(1, Math.ceil(9 * (1 - progresso)))

  const seguindo = andando && entregando
  const cam = seguindo ? camera(entregando, ZOOM_SEGUIR) : CAMERA[animar ? fase : 'entrega']
  const transicaoCamera = seguindo ? 'none' : 'transform 1.2s cubic-bezier(0.65, 0, 0.25, 1)'

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="rotulo text-fg-2">Painel ao vivo · Rápido JF</span>
          </div>
          <span className="font-mono text-xs text-fg-3">6 online</span>
        </div>

        {/* Mapa da cidade com câmera */}
        <div className="relative aspect-[380/240] overflow-hidden bg-[var(--mapa-terra)]">
          <svg viewBox={`0 0 ${JANELA.w} ${JANELA.h}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
            <g className="mapa-camera" style={{ transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`, transition: transicaoCamera }}>
              <CidadeBase animarCarga />
              <Frota animar={animar} />

              {/* Rota planejada (pontilhada) e o trecho já percorrido */}
              {passou('oferta') && (
                <path d={ROTA} fill="none" stroke="var(--fg-3)" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.5 11" />
              )}
              <path ref={rotaRef} d={ROTA} fill="none" stroke="none" />
              <path ref={ateColetaRef} d={ROTA_ATE_COLETA} fill="none" stroke="none" />
              <path
                d={ROTA} pathLength={1} fill="none" stroke="var(--brand-mark)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="1" strokeDashoffset={1 - progresso}
              />

              {/* Oferta: linha do motoboy escolhido até a coleta */}
              {fase === 'oferta' && (
                <path d={ROTA_ATE_COLETA} fill="none" stroke="var(--brand-mark)" strokeWidth="2.5" strokeDasharray="5 5" />
              )}

              {/* Radar procurando motoboy em volta da coleta */}
              {fase === 'busca' && animar && (
                <g>
                  <circle cx={COLETA.x} cy={COLETA.y} r="120" fill="none" stroke="var(--brand-mark)" strokeWidth="2" className="radar" />
                  <circle cx={COLETA.x} cy={COLETA.y} r="120" fill="none" stroke="var(--brand-mark)" strokeWidth="2" className="radar" style={{ animationDelay: '0.8s' }} />
                </g>
              )}

              {/* Coleta e entrega */}
              <circle cx={COLETA.x} cy={COLETA.y} r="9" fill="var(--surface)" stroke="var(--fg)" strokeWidth="5" />
              {!passou('entrega') && <Etiqueta x={COLETA.x} y={COLETA.y - 34} texto="Farmácia Central" />}
              <circle cx={DESTINO.x} cy={DESTINO.y} r="11" fill={chegou ? 'var(--brand-mark)' : 'var(--fg)'} style={{ transition: 'fill 0.25s' }} />
              {chegou
                ? <path key={`check-${volta}`} d={`M${DESTINO.x - 5} ${DESTINO.y} l4 4 l7 -8`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="carimbo-check" />
                : <Etiqueta x={DESTINO.x} y={DESTINO.y - 36} texto="Destino" escura />}

              {/* Diego: posição calculada a cada quadro (até a coleta e depois pela rota) */}
              {!chegou && (
                <g transform={`translate(${diego.x} ${diego.y})`}>
                  <Moto destaque={passou('oferta')} eta={andando ? eta : null} />
                </g>
              )}

              {/* Carimbo de entregue, ao lado do destino */}
              {chegou && (
                <g key={`carimbo-${volta}`} transform={`translate(${DESTINO.x - 150} ${DESTINO.y - 78})`}>
                  <g className="carimbo" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                    <rect width="118" height="40" rx="6" fill="var(--surface)" fillOpacity="0.92" stroke="var(--success)" strokeWidth="3" />
                    <text x="12" y="17" fill="var(--success)" fontSize="12" fontWeight="800" letterSpacing="0.1em" style={{ fontStretch: '80%' }}>ENTREGUE</text>
                    <text x="12" y="31" fill="var(--success)" fontSize="9.5" style={{ fontFamily: 'var(--font-plex-mono), monospace' }}>14:21 · com foto</text>
                  </g>
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Corrida */}
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="rotulo text-fg-3">Corrida #4821 · Farmácia Central</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] font-semibold text-fg">
                Centro
                <span className="flex items-center" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-fg" />
                  <span className="mx-0.5 w-6 border-t-2 border-dotted border-fg-3 sm:w-10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-mark" />
                </span>
                <span className="whitespace-nowrap">São Mateus</span>
              </p>
            </div>
            <p className="whitespace-nowrap font-mono text-lg font-medium tabular text-fg">R$ 14,00</p>
          </div>

          <div className="flex min-h-12 items-center justify-between gap-3">
            <span key={fase} className={cn('status-troca inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold', STATUS[fase].cls)}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {STATUS[fase].texto}
            </span>
            {fase === 'oferta' ? <ContagemOferta segundos={segundos} /> : fase === 'busca' ? (
              <span className="font-mono text-[12px] text-fg-3">6 motoboys num raio de 3 km</span>
            ) : (
              <span className="flex items-center gap-2 text-[13px] text-fg-2">
                Diego <span className="placa scale-90"><b>JF</b><span className="!text-[12px]">RTA-4E21</span></span>
              </span>
            )}
          </div>

          <ol className="space-y-1.5 border-t border-line pt-3 text-[13px]">
            {LINHA_DO_TEMPO.map((l) => {
              const feito = passou(l.fase)
              return (
                <li key={l.fase} className="flex items-center justify-between">
                  <span className={cn('flex items-center gap-2 transition-colors duration-300', feito ? 'text-fg' : 'text-fg-3')}>
                    <span className={cn('h-2 w-2 rounded-full border-2 transition-colors duration-300', feito ? 'border-brand-mark bg-brand-mark' : 'border-line-strong')} />
                    {l.texto}
                  </span>
                  <span className={cn('font-mono tabular transition-colors duration-300', feito ? 'text-fg-2' : 'text-fg-3')}>{feito ? l.hora : '--:--'}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
