'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import type { Map as MapaGL, Marker, GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cn } from '@/utils/cn'
import { estiloMapa, type TemaMapa } from './mapa/estilo'
import { difAngulo, percurso, pontoEm, rumo, trecho, type Ponto } from './mapa/geo'

// =============================================================================
// Operação ao vivo: o hero da landing
// =============================================================================
// Mapa 3D (MapLibre GL + WebGL) com as ruas e os prédios reais do centro de Juiz
// de Fora. Os tiles vêm de public/mapas/jf.pmtiles, servido pelo próprio site, e
// as rotas seguem as ruas de verdade (scripts/gerar-mapa-landing.mjs).
// Uma corrida completa roda em loop enquanto a frota circula pela cidade.
// =============================================================================

const FASES = [
  { id: 'busca', ms: 2600 },
  { id: 'oferta', ms: 2800 },
  { id: 'aceito', ms: 3400 },
  { id: 'coletado', ms: 1400 },
  { id: 'entrega', ms: 10000 },
  { id: 'entregue', ms: 4200 },
] as const
type Fase = (typeof FASES)[number]['id']
const MS = Object.fromEntries(FASES.map((f) => [f.id, f.ms])) as Record<Fase, number>

const STATUS: Record<Fase, string> = {
  busca: 'Procurando motoboy',
  oferta: 'Oferecida ao Diego',
  aceito: 'A caminho da coleta',
  coletado: 'Coletado',
  entrega: 'Em rota de entrega',
  entregue: 'Entregue',
}

const LINHA_DO_TEMPO: { fase: Fase; texto: string; hora: string }[] = [
  { fase: 'aceito', texto: 'Aceita por Diego', hora: '14:02' },
  { fase: 'coletado', texto: 'Coletado na Farmácia Central', hora: '14:10' },
  { fase: 'entrega', texto: 'Saiu para entrega', hora: '14:12' },
  { fase: 'entregue', texto: 'Entregue, com foto', hora: '14:21' },
]

let protocoloRegistrado = false
const VELOCIDADE_FROTA = 55 // m/s na tela: acelerado para a cidade parecer viva
const RASTRO = 320 // metros de rastro atrás de cada motoboy
const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface Rotas { coleta: Ponto; destino: Ponto; ateColeta: Ponto[]; entrega: Ponto[]; frota: Ponto[][] }
interface Camera { lng: number; lat: number; zoom: number; pitch: number; bearing: number }

const linha = (coords: Ponto[]) => ({
  type: 'FeatureCollection' as const,
  features: coords.length > 1 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } }] : [],
})

function elemento(classe: string, html = '') {
  const el = document.createElement('div')
  el.className = classe
  el.innerHTML = html
  return el
}

export default function OperacaoAoVivo({ className }: { className?: string }) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaGL | null>(null)
  const { resolvedTheme } = useTheme()
  const tema: TemaMapa = resolvedTheme === 'light' ? 'claro' : 'escuro'
  const temaRef = useRef(tema)

  const [indice, setIndice] = useState(4)
  const [animar, setAnimar] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const [segundos, setSegundos] = useState(90)
  const [eta, setEta] = useState(9)

  const fase = FASES[indice].id
  const faseRef = useRef<{ fase: Fase; inicio: number }>({ fase: 'entrega', inicio: 0 })

  // Ciclo das fases da corrida
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => { setAnimar(true); setIndice(0) }, 600)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    faseRef.current = { fase, inicio: performance.now() }
    if (!animar) return
    if (fase === 'busca') setSegundos(90)
    const t = setTimeout(() => setIndice((i) => (i + 1) % FASES.length), MS[fase])
    return () => clearTimeout(t)
  }, [animar, fase])
  useEffect(() => {
    if (!animar || fase !== 'oferta') return
    const t = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 380)
    return () => clearInterval(t)
  }, [animar, fase])

  // Mapa: criado uma vez; o laço de animação lê as fases pelo ref
  useEffect(() => {
    let cancelado = false
    let quadro = 0
    let visivel = true
    const marcadores: Marker[] = []
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    async function iniciar() {
      const [maplibregl, { Protocol }, rotasMod] = await Promise.all([
        import('maplibre-gl'),
        import('pmtiles'),
        import('./mapa/rotas-jf.json'),
      ])
      if (cancelado || !caixaRef.current) return
      const rotas = rotasMod.default as unknown as Rotas

      maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs')
      if (!protocoloRegistrado) { maplibregl.addProtocol('pmtiles', new Protocol().tile); protocoloRegistrado = true }

      const ateColeta = percurso(rotas.ateColeta)
      const entrega = percurso(rotas.entrega)
      const frota = rotas.frota.map((r) => percurso(r))

      const inicial: Camera = { lng: -43.3505, lat: -21.7672, zoom: 14.4, pitch: 52, bearing: -18 }
      const mapa = new maplibregl.Map({
        container: caixaRef.current,
        style: estiloMapa(temaRef.current, `pmtiles://${location.origin}/mapas/jf.pmtiles`),
        center: [inicial.lng, inicial.lat],
        zoom: inicial.zoom,
        pitch: inicial.pitch,
        bearing: inicial.bearing,
        maxPitch: 70,
        interactive: false,
        attributionControl: { compact: true },
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        fadeDuration: 0,
      })
      mapaRef.current = mapa
      mapa.on('error', (e) => console.warn('[mapa]', e.error?.message))

      // Marcadores em HTML: nítidos em qualquer zoom e estilizados pelo CSS do site
      const coleta = new maplibregl.Marker({ element: elemento('mapa-pino mapa-pino-coleta', '<span>Farmácia Central</span>'), anchor: 'bottom' })
        .setLngLat(rotas.coleta).addTo(mapa)
      const destino = new maplibregl.Marker({ element: elemento('mapa-pino mapa-pino-destino', '<span>Destino · São Mateus</span>'), anchor: 'bottom' })
        .setLngLat(rotas.destino).addTo(mapa)
      const diegoEl = elemento('mapa-moto', '<i></i><b></b><em>9 min</em>')
      const diego = new maplibregl.Marker({ element: diegoEl, anchor: 'center', pitchAlignment: 'viewport' })
        .setLngLat(rotas.ateColeta[0]).addTo(mapa)
      const radar = new maplibregl.Marker({ element: elemento('mapa-radar', '<i></i><i></i>'), anchor: 'center', pitchAlignment: 'map' })
        .setLngLat(rotas.coleta).addTo(mapa)
      const bairros: { marcador: Marker; lngLat: Ponto }[] = []
      for (const [nome, lngLat] of [['Centro', [-43.3452, -21.7598]], ['São Mateus', [-43.3578, -21.7768]], ['Alto dos Passos', [-43.3418, -21.7712]], ['Mariano Procópio', [-43.3505, -21.7488]]] as const) {
        const marcador = new maplibregl.Marker({ element: elemento('mapa-bairro', nome), anchor: 'center' }).setLngLat(lngLat as unknown as Ponto).addTo(mapa)
        bairros.push({ marcador, lngLat: lngLat as unknown as Ponto })
        marcadores.push(marcador)
      }
      marcadores.push(coleta, destino, diego, radar)

      // Foco da câmera fora do texto (desktop) e acima do card (celular)
      let folga = { top: 0, bottom: 0, left: 0, right: 0 }
      const medir = () => {
        const { width: w, height: h } = caixaRef.current!.getBoundingClientRect()
        folga = w >= 1024
          ? { top: h * 0.08, bottom: h * 0.12, left: w * 0.44, right: w * 0.04 }
          : { top: 0, bottom: Math.min(230, h * 0.45), left: 0, right: 0 }
      }
      medir()
      const tamanho = new ResizeObserver(medir)
      tamanho.observe(caixaRef.current)
      mapa.once('remove', () => tamanho.disconnect())

      const cam: Camera = { ...inicial }
      let ultimo = performance.now()
      let etaAtual = 9
      const fonte = (id: string) => mapa.getSource(id) as GeoJSONSource | undefined

      function quadroDaFase(agora: number) {
        const { fase, inicio } = faseRef.current
        const t = reduzido ? 0.55 : Math.min(1, (agora - inicio) / MS[fase])
        let pos: Ponto = rotas.ateColeta[0]
        let feito = 0
        if (fase === 'aceito') pos = pontoEm(ateColeta, suave(t) * ateColeta.total)
        else if (fase === 'coletado') pos = rotas.coleta
        else if (fase === 'entrega') { feito = suave(t) * entrega.total; pos = pontoEm(entrega, feito) }
        else if (fase === 'entregue') { feito = entrega.total; pos = rotas.destino }
        return { fase, t, pos, feito }
      }

      function alvoCamera(f: ReturnType<typeof quadroDaFase>, agora: number, alvoAnterior: Camera): Camera {
        const centro = (p: Ponto) => ({ lng: p[0], lat: p[1] })
        switch (f.fase) {
          case 'busca':
            return { ...centro([-43.3512, -21.7668]), zoom: 14.5, pitch: 52, bearing: -18 + f.t * 14 }
          case 'oferta':
            return { ...centro([(rotas.coleta[0] + rotas.ateColeta[0][0]) / 2, (rotas.coleta[1] + rotas.ateColeta[0][1]) / 2]), zoom: 15.6, pitch: 58, bearing: alvoAnterior.bearing + 0.02 }
          case 'aceito':
          case 'entrega': {
            const percursoAtual = f.fase === 'aceito' ? ateColeta : entrega
            const d = f.fase === 'aceito' ? suave(f.t) * ateColeta.total : f.feito
            const adiante = pontoEm(percursoAtual, d + 90)
            const direcao = Math.hypot(adiante[0] - f.pos[0], adiante[1] - f.pos[1]) > 1e-6 ? rumo(f.pos, adiante) : alvoAnterior.bearing
            return { ...centro(f.pos), zoom: f.fase === 'aceito' ? 16 : 16.4, pitch: 64, bearing: direcao }
          }
          case 'coletado':
            return { ...centro(rotas.coleta), zoom: 16.6, pitch: 62, bearing: alvoAnterior.bearing }
          case 'entregue':
            return { ...centro(rotas.destino), zoom: 15.7, pitch: 60, bearing: alvoAnterior.bearing + (agora - ultimo) * 0.006 }
        }
      }

      let alvo: Camera = { ...inicial }
      function desenhar(agora: number) {
        const dt = Math.min(64, agora - ultimo)
        const s = agora / 1000

        // Frota em laço, com rastro que some no fim
        const rastros = [], pontos = []
        for (let i = 0; i < frota.length; i++) {
          const p = frota[i]
          const d = ((reduzido ? 900 : s * VELOCIDADE_FROTA) + i * 830) % p.total
          const coords = d >= RASTRO ? trecho(p, d - RASTRO, d) : [...trecho(p, p.total - (RASTRO - d), p.total), ...trecho(p, 0, d)]
          if (coords.length > 1) rastros.push({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } })
          pontos.push({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: pontoEm(p, d) } })
        }
        fonte('frota')?.setData({ type: 'FeatureCollection', features: rastros })
        fonte('frotaPontos')?.setData({ type: 'FeatureCollection', features: pontos })

        // Corrida principal
        const f = quadroDaFase(agora)
        const mostraRota = f.fase !== 'busca'
        fonte('planejada')?.setData(linha(mostraRota ? rotas.entrega : []))
        fonte('percorrida')?.setData(linha(f.feito > 0 ? trecho(entrega, 0, f.feito) : []))
        fonte('oferta')?.setData(linha(f.fase === 'oferta' ? rotas.ateColeta : []))
        diego.setLngLat(f.pos)
        diegoEl.dataset.fase = f.fase
        radar.getElement().dataset.ativo = String(f.fase === 'busca')
        destino.getElement().dataset.entregue = String(f.fase === 'entregue')
        coleta.getElement().dataset.feito = String(['entrega', 'entregue'].includes(f.fase))
        const novoEta = f.fase === 'entrega' ? Math.max(1, Math.ceil(9 * (1 - f.feito / entrega.total))) : 9
        if (novoEta !== etaAtual) {
          etaAtual = novoEta
          diegoEl.querySelector('em')!.textContent = `${novoEta} min`
          setEta(novoEta)
        }

        // Câmera: persegue o alvo com amortecimento (sem cortes entre as fases)
        alvo = alvoCamera(f, agora, alvo)
        const k = reduzido ? 1 : 1 - Math.exp(-dt / (f.fase === 'entrega' || f.fase === 'aceito' ? 420 : 900))
        const kRumo = reduzido ? 1 : 1 - Math.exp(-dt / 1400)
        cam.lng += (alvo.lng - cam.lng) * k
        cam.lat += (alvo.lat - cam.lat) * k
        cam.zoom += (alvo.zoom - cam.zoom) * k
        cam.pitch += (alvo.pitch - cam.pitch) * k
        cam.bearing += difAngulo(cam.bearing, alvo.bearing) * kRumo
        mapa.jumpTo({ center: [cam.lng, cam.lat], zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing, padding: folga })
        // Nome de bairro não aparece por baixo do texto do hero
        for (const b of bairros) b.marcador.getElement().dataset.oculto = String(mapa.project(b.lngLat).x < folga.left * 0.95)
        ultimo = agora
      }

      function laco(agora: number) {
        if (visivel && !document.hidden) desenhar(agora)
        else ultimo = agora
        if (!reduzido) quadro = requestAnimationFrame(laco)
      }

      mapa.on('load', () => {
        if (cancelado) return
        setPronto(true)
        if (reduzido) {
          // Um quadro parado, já no meio da entrega
          faseRef.current = { fase: 'entrega', inicio: 0 }
          for (let i = 0; i < 4; i++) desenhar(performance.now())
        } else quadro = requestAnimationFrame(laco)
      })

      // Pausa fora da tela: não gasta GPU com o hero rolado para cima
      const obs = new IntersectionObserver(([e]) => { visivel = e.isIntersecting })
      obs.observe(caixaRef.current)
      mapa.once('remove', () => obs.disconnect())
    }

    iniciar().catch((erro) => {
      console.warn('[mapa] sem WebGL ou falha ao carregar:', erro)
      if (!cancelado) setFalhou(true)
    })

    return () => {
      cancelado = true
      cancelAnimationFrame(quadro)
      marcadores.forEach((m) => m.remove())
      mapaRef.current?.remove()
      mapaRef.current = null
    }
  }, [])

  // Troca de tema: o estilo muda por diff, sem recriar o mapa
  useEffect(() => {
    temaRef.current = tema
    const mapa = mapaRef.current
    if (!mapa || !pronto) return
    mapa.setStyle(estiloMapa(tema, `pmtiles://${location.origin}/mapas/jf.pmtiles`), { diff: true })
  }, [tema, pronto])

  const ordem = (f: Fase) => FASES.findIndex((x) => x.id === f)
  const passou = (f: Fase) => indice >= ordem(f)

  return (
    <div className={cn('relative overflow-hidden bg-[var(--mapa-fundo)]', className)}>
      <div ref={caixaRef} className={cn('absolute inset-0 transition-opacity duration-700', pronto ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
      {falhou && <div className="absolute inset-0 bg-[url('/mapas/hero-poster.webp')] bg-cover bg-center" aria-hidden="true" />}

      {/* Corrida em andamento, como aparece no painel da central */}
      <div className="operacao-card absolute bottom-4 right-4 z-20 w-[min(340px,calc(100%-2rem))] sm:bottom-6 sm:right-6" role="status" aria-live="off">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[12px] text-fg-3">
          <span className="flex items-center gap-2 text-fg-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Rápido JF · ao vivo
          </span>
          <span className="font-mono">8 motoboys online</span>
        </div>
        <div className="space-y-3 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-fg-3">#4821 · Farmácia Central</p>
              <p className="mt-0.5 text-[15px] font-semibold text-fg">Centro → São Mateus</p>
            </div>
            <p className="font-mono text-[15px] tabular text-fg">R$ 14,00</p>
          </div>
          <div className="flex h-7 items-center justify-between gap-3">
            <span key={fase} className={cn('status-troca inline-flex items-center gap-1.5 text-[13px] font-medium', fase === 'entregue' ? 'text-success' : fase === 'entrega' ? 'text-brand-mark' : 'text-fg')}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {STATUS[fase]}
            </span>
            <span className="font-mono text-[12px] text-fg-3">
              {fase === 'busca' ? '8 num raio de 3 km' : fase === 'oferta' ? `aceite em ${segundos}s` : fase === 'entrega' ? `chega em ${eta} min` : 'Diego · RTA-4E21'}
            </span>
          </div>
          <ol className="hidden space-y-1 border-t border-line pt-3 text-[12.5px] sm:block">
            {LINHA_DO_TEMPO.map((l) => {
              const feito = passou(l.fase)
              return (
                <li key={l.fase} className="flex items-center justify-between">
                  <span className={cn('flex items-center gap-2 transition-colors duration-300', feito ? 'text-fg' : 'text-fg-3')}>
                    <span className={cn('h-1.5 w-1.5 rounded-full transition-colors duration-300', feito ? 'bg-fg' : 'bg-line-strong')} />
                    {l.texto}
                  </span>
                  <span className="font-mono tabular text-fg-3">{feito ? l.hora : '--:--'}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
