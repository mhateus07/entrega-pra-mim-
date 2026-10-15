# Kit de prospecção — Entrega Pra Mim (one-pager, posts e Reels)

Peças feitas em HTML com a identidade "Chegada" (`brand/`): papel `#F6F5F1`, asfalto `#141413`,
laranja só no símbolo e no que está acontecendo agora, Host Grotesk + IBM Plex Mono (em `assets/*.ttf`).
As telas em `assets/telas/` e os vídeos em `assets/videos/` são da central-exemplo fictícia "Rápido JF Motofrete".

Requisitos: Python 3 com `playwright` (Chromium), `Pillow`, `qrcode` e `ffmpeg`.

    cd scripts/kit-vendas
    python3 render.py one-pager.html 794 1123 ../out/one-pager.png ../out/one-pager.pdf 2
    python3 render.py post-1-despacho.html 1080 1350 ../out/post-1-despacho.png - 1
    python3 render.py post-2-fechamento.html 1080 1350 ../out/post-2-fechamento.png - 1
    python3 render.py post-3-planos.html 1080 1350 ../out/post-3-planos.png - 1
    cd reels && ./montar.sh        # gera ../../out/reels-do-pedido-ao-fechamento.mp4 e reels-capa.jpg

(As saídas vão para `out/`, uma pasta acima de `scripts/kit-vendas/`; troque o caminho se preferir.)

- Texto ou preço: edite o HTML e rode de novo. Preços iguais a `src/lib/planos.ts`.
- Cenas do Reels: textos e posições em `reels/gen.py`; recortes, tempos e velocidade em `reels/montar.sh`
  (as posições x/y/largura/altura precisam bater nos dois arquivos).
- QR do one-pager: `python3 qr.py`.
