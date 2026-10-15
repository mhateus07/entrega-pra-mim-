#!/usr/bin/env bash
# Monta o Reels "do pedido ao fechamento" (1080x1920, ~22 s, H.264 + AAC mudo).
# Rode dentro de scripts/kit-vendas/reels. Precisa de python3 (playwright + Pillow) e ffmpeg.
set -euo pipefail
V=../assets/videos
python3 gen.py
for k in c1 c2 c3 c4 c5 c6; do python3 ../render.py $k.html 1080 1920 $k.png - 1; done
# máscaras de cantos arredondados (mesmo raio do cartão no HTML)
python3 -c "
from PIL import Image, ImageDraw
for w,h,n in [(960,752,'m2'),(936,600,'m3'),(1000,829,'m4')]:
    m=Image.new('L',(w,h),0); ImageDraw.Draw(m).rounded_rectangle((0,0,w-1,h-1),20,fill=255); m.save(n+'.png')"
still(){ ffmpeg -v error -y -loop 1 -framerate 30 -t $3 -i $2 -vf "$4format=yuv420p" -c:v libx264 -crf 16 $1.mp4; }
# vid saida fundo duracao video filtro x y mascara
vid(){ ffmpeg -v error -y -loop 1 -framerate 30 -t $3 -i $2 -i $4 -loop 1 -framerate 30 -t $3 -i $8 -filter_complex \
  "[1:v]$5,fps=30,tpad=stop_mode=clone:stop_duration=3,format=rgba[v];[2:v]format=gray[m];[v][m]alphamerge[va];[0:v][va]overlay=$6:$7:shortest=1,format=yuv420p" -t $3 -c:v libx264 -crf 16 $1.mp4; }
still s1 c1.png 2.8 ""
# 1. farmácia: tela "Nova entrega" (1440x900, 1x), recorte do formulário + resumo
vid s2 c2.png 4.6 $V/03-empresa-cliente-abre-e-acompanha-pedido.mp4 "trim=2.0:4.65,setpts=(PTS-STARTPTS)/0.6,crop=996:780:222:80,scale=960:752:flags=lanczos" 60 500 m2.png
# 2. motoboy: só o cartão da oferta (390x844, 1x), ampliado 2,4x
vid s3 c3.png 5.4 $V/02-motoboy-recebe-e-aceita-corrida-celular.mp4 "trim=2.1:7.45,setpts=PTS-STARTPTS,crop=390:250:0:255,scale=936:600:flags=lanczos,unsharp=5:5:0.6" 72 640 m3.png
# 3. central: fechamento por motoboy, ampliado 1,3x e percorrendo a tabela da esquerda (motoboy) para a direita (saldo do acerto)
vid s4 c4.png 4.4 $V/01-central-painel-despacho-fechamento.mp4 "trim=11.4:12.5,setpts=(PTS-STARTPTS)*3.4,crop=w=760:h=630:x='262+396*min(1\,max(0\,(t-0.4)/2.9))':y=135,scale=1000:829:flags=lanczos" 40 540 m4.png
# 4. rastreio (tela estática) com aproximação lenta
still s5 c5.png 3.6 "zoompan=z='1+0.0004*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,"
still s6 c6.png 3.6 ""
mkdir -p ../../out
ffmpeg -v error -y -i s1.mp4 -i s2.mp4 -i s3.mp4 -i s4.mp4 -i s5.mp4 -i s6.mp4 -f lavfi -t 22.4 -i anullsrc=r=44100:cl=stereo -filter_complex \
"[0][1]xfade=transition=fade:duration=0.4:offset=2.4[a];[a][2]xfade=transition=slideleft:duration=0.4:offset=6.6[b];[b][3]xfade=transition=slideleft:duration=0.4:offset=11.6[c];[c][4]xfade=transition=slideleft:duration=0.4:offset=15.6[d];[d][5]xfade=transition=fade:duration=0.4:offset=18.8,format=yuv420p[v]" \
-map "[v]" -map 6:a -c:v libx264 -crf 19 -preset slow -r 30 -movflags +faststart -c:a aac -shortest ../../out/reels-do-pedido-ao-fechamento.mp4
ffmpeg -v error -y -i ../../out/reels-do-pedido-ao-fechamento.mp4 -frames:v 1 -q:v 2 ../../out/reels-capa.jpg
[ "${MANTER:-0}" = 1 ] || rm -f s?.mp4 c?.png c?.html m?.png
