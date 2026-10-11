# Marca Entrega Pra Mim

Guia completo, com tokens, componentes e regras de uso: **Design System "Entrega Pra Mim"** no Claude (artifact privado do Mateus). Este README resume o que está nesta pasta e o que mudou no código.

## Na prática

- **Para quem a marca fala:** primeiro o dono da central de motofrete, que é quem compra. Depois o despachante, o motoboy e o destinatário que abre o link de rastreio.
- **Conceito:** a rota que termina em entregue. O símbolo começa num anel (a coleta) e termina num ponto cheio (a entrega), formando um sinal de confirmado. O pingo do "i" de "Mim" é esse mesmo ponto, em laranja.
- **Assinatura:** "Despacha. Rastreia. Fecha o dia."
- **Cores:** neutros quentes (papel #F6F5F1 e asfalto #141413) com o laranja colete (#E2570F) usado com intenção: no símbolo, no ponto de destino, na faixa colete e no botão de ação. O azul rota (#1F63C1) é só do mapa e da placa.
- **Letras:** Archivo em tudo, com títulos estreitados (largura 90%, peso 800). IBM Plex Mono para código de pedido, placa, horário e valor.
- **Elementos:** a rota (anel, linha e ponto), a faixa colete (banda laranja com duas faixas refletivas) e a placa (caixa com tarja azul, como a placa Mercosul).
- **Marca da central (white-label):** no plano Marca Própria, o rastreio mostra o logo e a cor da central. A Entrega Pra Mim aparece só como "tecnologia Entrega Pra Mim" no rodapé. Nos outros planos, a marca Entrega Pra Mim fica no topo e a central aparece como "Entrega feita por…".
- **Cartão de visita:** o telefone em `png/cartao-visita.png` é um exemplo e precisa ser trocado antes de imprimir.

## O que tem aqui

| Pasta | Conteúdo |
| --- | --- |
| `logo/` | Todas as versões em SVG: horizontal, empilhado, negativo, mono preto e branco, logotipo, símbolo (laranja, asfalto e branco) e glifo |
| `padroes/` | Faixa colete, rota e placa em SVG |
| `png/` | Imagem de compartilhamento (OG), post de Instagram, cartão de visita e mockup do rastreio white-label |
| `aplicacoes/` | Os HTMLs que geram os PNGs, com as fontes. Abra no navegador e tire o print no tamanho do `body` para regerar |
| `tokens.json` | Tokens de cor (claro/escuro), tipografia, espaço, cantos e sombra |

## Técnico: o que mudou no código

- `src/components/brand/Logo.tsx`: o novo símbolo em `LogoMark` (com a variante `asfalto`) e um novo `LogoWordmark` com o logotipo em curvas. A tinta segue `currentColor`, então funciona no tema claro e no escuro. O pingo do "i" usa `var(--brand-mark)`.
- `src/app/globals.css`:
  - `--page` passou para #f6f5f1, `--fg` e `--primary` para #141413 e `--fg-3` para #6f6d66 (4.5:1 sobre o papel, o anterior dava 3.5:1).
  - `--brand` passou para #bc450a (texto branco a 5.3:1; o #e2570f dava 3.7:1 e não passava em botão), com `--brand-hover` em #a83d08.
  - Novo `--brand-mark` (#e2570f no claro, #f0712b no escuro) para símbolo e grafismos, com a classe `bg-brand-mark`/`text-brand-mark`.
  - As famílias passaram para Archivo e IBM Plex Mono. Nova classe `.text-display` para títulos.
- `src/app/layout.tsx`: troca de Inter por Archivo (variável com eixo `wdth`) e IBM Plex Mono via `next/font`, imagem OG, ícone da Apple e `themeColor` novos.
- `public/`:
  - `logo.svg`, `icons/icon.svg`, `icons/icon-maskable.svg` e todos os PNGs de `icons/` foram regerados com o símbolo novo.
  - Novos `icons/apple-touch-icon-180x180.png`, `icons/favicon-32x32.png`, `icons/favicon-16x16.png`, `icons/icon-maskable-{192,512}.png` e `og-image.png`.
- `public/manifest.json`: cores novas, e os ícones `maskable` agora ficam separados dos `any`.

Os textos da landing e do one-pager não mudaram. Eles entram na Etapa 7 do `docs/PROMPT_CLAUDE_CODE_REPOSICIONAMENTO.md`, já com o tom de voz do guia.
