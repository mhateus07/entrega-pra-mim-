# Marca Entrega Pra Mim — "Chegada"

Identidade adotada em 13/10/2026, no lugar da anterior (quadrado laranja com o "check", títulos condensados e faixa colete).

## Na prática

- **Para quem a marca fala:** primeiro o dono da central de motofrete, que é quem compra. Depois o despachante, o motoboy e o destinatário que abre o link de rastreio.
- **Símbolo:** uma barra horizontal (a rota) que termina numa barra vertical laranja (a porta do cliente). Lê-se "chegou". Sem moldura; no ícone de app ele vai sobre um quadrado em asfalto.
- **Logotipo:** "Entrega Pra Mim" em Host Grotesk 600, com espaçamento de −0,035em, convertido em curvas nos arquivos de `logo/`. No site o nome é texto na mesma fonte.
- **Cores:** neutros (papel #F6F5F1 e asfalto #121314) e o laranja (#E2570F no claro, #F0712B no escuro). O laranja aparece só na porta do símbolo, no que está acontecendo agora (a moto e a rota percorrida no mapa) e no botão principal. Nunca em palavras de títulos.
- **Letras:** Host Grotesk em tudo, peso 600 nos títulos, frases completas em caixa normal. IBM Plex Mono para código de pedido, placa, horário e valor.
- **O que saiu:** a faixa colete, a régua laranja sobre os títulos, os rótulos em caixa-alta com "01 ·", o ícone em cada card e a assinatura "Despacha. Rastreia. Fecha o dia." como manchete.
- **Marca da central (white-label):** no plano Marca Própria, o rastreio mostra o logo e a cor da central e a Entrega Pra Mim aparece só como "tecnologia Entrega Pra Mim" no rodapé.

## Arquivos

| Arquivo | Uso |
| --- | --- |
| `logo/epm-logo-horizontal.svg` | Versão principal, sobre fundo claro |
| `logo/epm-logo-horizontal-negativo.svg` | Sobre fundo escuro |
| `logo/epm-logo-horizontal-mono-preto.svg` / `-mono-branco.svg` | Uma cor só (carimbo, gravação, documento) |
| `logo/epm-logotipo.svg` | Só o nome |
| `logo/epm-simbolo.svg` / `-branco.svg` | Só o símbolo |
| `logo/epm-icone-app.svg` | Ícone de app (quadrado em asfalto) |
| `tokens.json` | Cores (claro/escuro), tipografia, espaço, cantos e sombra |

Os SVGs e os ícones de `public/icons/` são gerados a partir da fonte; para mudar a geometria, edite `src/components/brand/Logo.tsx` (site) e regere os arquivos.

## Mapa da landing

O hero mostra uma corrida em 3D nas ruas reais do centro de Juiz de Fora (MapLibre GL). Os tiles ficam em `public/mapas/jf.pmtiles` e as rotas em `src/components/landing/mapa/rotas-jf.json`; os dois são gerados por `scripts/gerar-mapa-landing.mjs` (instruções no topo do script). O site não chama nenhum serviço de mapa externo. Dados © OpenStreetMap.
