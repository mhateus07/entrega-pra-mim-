// Gera os dados do mapa 3D da landing (src/components/landing/mapa/).
//
// 1) Ruas, quadras e prédios de Juiz de Fora (só a área do centro, ~1,5 MB):
//      brew install pmtiles
//      pmtiles extract https://build.protomaps.com/AAAAMMDD.pmtiles public/mapas/jf.pmtiles \
//        --bbox=-43.40,-21.80,-43.31,-21.73 --maxzoom=15
//    (troque AAAAMMDD por uma build recente de https://maps.protomaps.com/builds)
//
// 2) Rotas pelas ruas reais (este script): node scripts/gerar-mapa-landing.mjs
//    Usa o servidor público de demonstração do OSRM, só na hora de gerar.
//    O site não chama nenhum serviço externo: tiles e rotas são servidos por ele mesmo.

import { writeFileSync } from 'node:fs'

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

// [lat, lng] — pontos aproximados de bairros de Juiz de Fora
const P = {
  coleta: [-21.7617, -43.3494], // Farmácia Central, Rio Branco × Halfeld
  destino: [-21.7738, -43.3537], // São Mateus
  baseDiego: [-21.7655, -43.3445], // Alto dos Passos
}

const FROTA = [
  [[-21.747, -43.35], [-21.759, -43.344], [-21.756, -43.336]],
  [[-21.769, -43.348], [-21.777, -43.36], [-21.76, -43.36]],
  [[-21.786, -43.36], [-21.774, -43.351], [-21.77, -43.342]],
  [[-21.748, -43.333], [-21.762, -43.347], [-21.753, -43.356]],
  [[-21.79, -43.34], [-21.778, -43.342], [-21.764, -43.35]],
  [[-21.765, -43.356], [-21.756, -43.352], [-21.76, -43.348]],
  [[-21.756, -43.342], [-21.752, -43.339], [-21.763, -43.345]],
]

const arred = (n) => Math.round(n * 1e6) / 1e6

async function rota(pontos) {
  const coords = pontos.map(([lat, lng]) => `${lng},${lat}`).join(';')
  const res = await fetch(`${OSRM}/${coords}?overview=full&geometries=geojson`)
  const json = await res.json()
  if (json.code !== 'Ok') throw new Error(`OSRM: ${json.code} ${json.message ?? ''}`)
  return json.routes[0].geometry.coordinates.map(([lng, lat]) => [arred(lng), arred(lat)])
}

const dados = {
  coleta: [P.coleta[1], P.coleta[0]],
  destino: [P.destino[1], P.destino[0]],
  ateColeta: await rota([P.baseDiego, P.coleta]),
  entrega: await rota([P.coleta, P.destino]),
  // Cada motoboy da frota roda em laço: A → B → C → A
  frota: [],
}
for (const pontos of FROTA) {
  dados.frota.push(await rota([...pontos, pontos[0]]))
  await new Promise((r) => setTimeout(r, 400)) // gentileza com o servidor de demonstração
}

writeFileSync(new URL('../src/components/landing/mapa/rotas-jf.json', import.meta.url), JSON.stringify(dados))
console.log('rotas-jf.json:', dados.entrega.length, 'pontos na entrega,', dados.frota.length, 'motoboys na frota')
