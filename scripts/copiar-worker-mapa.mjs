// O worker do MapLibre GL (ESM) não é empacotado pelo Turbopack: copiamos os
// arquivos do pacote para public/vendor/maplibre/ antes do dev e do build, e o
// mapa da landing aponta para eles com setWorkerUrl(). Sempre na versão instalada.
import { copyFileSync, mkdirSync } from 'node:fs'

const origem = new URL('../node_modules/maplibre-gl/dist/', import.meta.url)
const destino = new URL('../public/vendor/maplibre/', import.meta.url)
mkdirSync(destino, { recursive: true })
for (const arquivo of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(new URL(arquivo, origem), new URL(arquivo, destino))
}
