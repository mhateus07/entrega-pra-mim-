import type { StyleSpecification } from 'maplibre-gl'

// Estilo do mapa 3D da landing, desenhado sobre o esquema de camadas do Protomaps
// (earth, landuse, water, roads, buildings). Sem rótulos dos tiles: os poucos nomes
// que aparecem são marcadores nossos, então não depende de fontes externas.

export type TemaMapa = 'claro' | 'escuro'

const CORES = {
  escuro: {
    fundo: '#0a0b0d', terra: '#0e0f12', parque: '#111a14', agua: '#0b1824',
    ruaMenor: '#23262c', ruaMaior: '#33373f', via: '#3d424b', predio: '#1c1f25', predioTopo: '#2b3039',
    rotaPlanejada: '#8a8f99', frota: '#c9d1dc',
  },
  claro: {
    fundo: '#ecebe6', terra: '#efeee9', parque: '#dfe6d8', agua: '#cbd9e5',
    ruaMenor: '#fbfaf7', ruaMaior: '#ffffff', via: '#ffffff', predio: '#e2e0d9', predioTopo: '#d9d6ce',
    rotaPlanejada: '#55585f', frota: '#5b6472',
  },
} as const

export const LARANJA = { claro: '#e2570f', escuro: '#f0712b' } as const

const vazio = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } as const

export function estiloMapa(tema: TemaMapa, urlTiles: string): StyleSpecification {
  const c = CORES[tema]
  const laranja = LARANJA[tema]
  const largura = (base: number) => ['interpolate', ['exponential', 1.6], ['zoom'], 12, base * 0.35, 15, base, 18, base * 5] as unknown as number

  return {
    version: 8,
    // Luz vinda do alto à esquerda: dá volume às fachadas dos prédios
    light: { anchor: 'viewport', color: '#ffffff', intensity: tema === 'escuro' ? 0.28 : 0.18, position: [1.4, 210, 35] },
    sources: {
      jf: { type: 'vector', url: urlTiles, attribution: '© OpenStreetMap' },
      // Fontes animadas: preenchidas a cada quadro pelo componente
      frota: { ...vazio, lineMetrics: true } as never,
      frotaPontos: vazio as never,
      planejada: vazio as never,
      percorrida: { ...vazio, lineMetrics: true } as never,
      oferta: vazio as never,
    },
    layers: [
      { id: 'fundo', type: 'background', paint: { 'background-color': c.fundo } },
      { id: 'terra', type: 'fill', source: 'jf', 'source-layer': 'earth', paint: { 'fill-color': c.terra } },
      {
        id: 'parques', type: 'fill', source: 'jf', 'source-layer': 'landuse',
        filter: ['in', ['get', 'kind'], ['literal', ['park', 'garden', 'forest', 'wood', 'grass', 'nature_reserve', 'cemetery', 'pitch']]],
        paint: { 'fill-color': c.parque },
      },
      { id: 'agua', type: 'fill', source: 'jf', 'source-layer': 'water', paint: { 'fill-color': c.agua } },
      {
        id: 'ruas-menores', type: 'line', source: 'jf', 'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['minor_road', 'other']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.ruaMenor, 'line-width': largura(5) },
      },
      {
        id: 'ruas-maiores', type: 'line', source: 'jf', 'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'major_road'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.ruaMaior, 'line-width': largura(8) },
      },
      {
        id: 'vias', type: 'line', source: 'jf', 'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'highway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.via, 'line-width': largura(10) },
      },

      {
        id: 'predios', type: 'fill-extrusion', source: 'jf', 'source-layer': 'buildings',
        minzoom: 13.5,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'height'], 9], 0, c.predio, 60, c.predioTopo],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.6, ['coalesce', ['get', 'height'], 9]],
          'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
          'fill-extrusion-opacity': tema === 'escuro' ? 0.92 : 0.85,
          'fill-extrusion-vertical-gradient': true,
        },
      },

      // Rotas por cima dos prédios: com a câmera inclinada, a rota fica sempre legível
      {
        id: 'frota-rastro', type: 'line', source: 'frota',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': largura(3.2),
          'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, c.frota],
        },
      },
      {
        id: 'planejada', type: 'line', source: 'planejada',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.rotaPlanejada, 'line-width': largura(2.4), 'line-dasharray': [0.6, 2.2], 'line-opacity': 0.9 },
      },
      {
        id: 'oferta', type: 'line', source: 'oferta',
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': laranja, 'line-width': largura(2.2), 'line-dasharray': [1.5, 1.5] },
      },
      {
        id: 'percorrida-brilho', type: 'line', source: 'percorrida',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': laranja, 'line-width': largura(14), 'line-blur': largura(9), 'line-opacity': tema === 'escuro' ? 0.55 : 0.3 },
      },
      {
        id: 'percorrida', type: 'line', source: 'percorrida',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': laranja, 'line-width': largura(5) },
      },

      {
        id: 'frota-pontos-halo', type: 'circle', source: 'frotaPontos',
        paint: { 'circle-radius': 14, 'circle-color': c.frota, 'circle-opacity': 0.22, 'circle-blur': 0.6, 'circle-pitch-alignment': 'map' },
      },
      {
        id: 'frota-pontos', type: 'circle', source: 'frotaPontos',
        paint: { 'circle-radius': 5.5, 'circle-color': c.frota, 'circle-stroke-color': c.fundo, 'circle-stroke-width': 2, 'circle-pitch-alignment': 'map' },
      },
    ],
  }
}
