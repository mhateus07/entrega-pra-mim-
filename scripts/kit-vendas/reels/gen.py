# Gera os fundos (HTML 1080x1920) de cada cena do Reels "do pedido ao fechamento".
# As posições das telas (x, y, w, h) precisam bater com as do montar.sh.
# Zonas da interface do Instagram: nada importante acima de y=200 nem abaixo de y=1540.
SCENES = {
    'c1': dict(kind='hook'),
    'c2': dict(n='1', t='A farmácia abre o pedido', s='No portal dela, já com o preço da corrida.', sy=380,
               x=60, y=500, w=960, h=752, cap='Portal da empresa cliente · nova entrega'),
    'c3': dict(n='2', t='O motoboy recebe e aceita', s='90 segundos para aceitar. Se não aceitar, vai para o próximo.', sy=470,
               x=72, y=640, w=936, h=600, cap='Celular do motoboy · oferta de corrida'),
    'c4': dict(n='3', t='A central fecha o mês', s='Quanto pagar a cada motoboy e cobrar de cada empresa.', sy=380,
               x=40, y=540, w=1000, h=829, cap='Painel da central · fechamento por motoboy'),
    'c5': dict(n='4', t='Quem recebe vê: entregue, com foto', s='No link de rastreio, com o logo da sua central.', sy=470,
               img='../assets/telas/rastreio-entregue.jpg', x=290, y=600, w=500, h=860, cap='Link de rastreio · plano Marca própria'),
    'c6': dict(kind='end'),
}

HEAD = '''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="../base.css"><style>
body{width:1080px;height:1920px;overflow:hidden;position:relative;background:var(--asfalto);color:#fff}
.n{position:absolute;left:90px;top:220px;font-family:'IBM Plex Mono';font-weight:500;font-size:30px;color:var(--e-t3)}
.t{position:absolute;left:90px;right:90px;top:270px;font-size:80px;line-height:1.02;letter-spacing:-0.035em}
.s{position:absolute;left:90px;right:90px;font-size:36px;line-height:1.35;color:var(--e-t2)}
.card{position:absolute;background:#fff;border-radius:20px;box-shadow:0 0 0 1.5px #2B2B29,0 50px 100px -30px rgba(0,0,0,.7)}
.cap{position:absolute;left:0;right:0;text-align:center;font-size:23px;color:var(--e-t3)}
.ok{display:inline-block;width:22px;height:12px;border-left:3.5px solid #3DBB68;border-bottom:3.5px solid #3DBB68;transform:rotate(-45deg);margin:0 30px 10px 4px}
</style></head><body>'''

for k, c in SCENES.items():
    if c.get('kind') == 'hook':
        body = '''<img src="../assets/epm-logo-horizontal-negativo.svg" style="position:absolute;left:90px;top:230px;height:52px">
<h1 style="position:absolute;left:90px;right:90px;top:600px;font-size:132px;line-height:.96;letter-spacing:-0.045em">Ainda despacha corrida pelo WhatsApp?</h1>
<p style="position:absolute;left:90px;right:120px;top:1170px;font-size:42px;line-height:1.35;color:var(--e-t2)">Olha como fica com o pedido entrando direto no sistema.</p>'''
    elif c.get('kind') == 'end':
        body = '''<img src="../assets/epm-logo-horizontal-negativo.svg" style="position:absolute;left:90px;top:300px;height:64px">
<h1 style="position:absolute;left:90px;right:90px;top:460px;font-size:98px;line-height:.98;letter-spacing:-0.045em">Sua central de motoboy, do despacho ao fechamento.</h1>
<div style="position:absolute;left:90px;top:900px;display:flex;flex-direction:column;gap:26px;font-size:40px;font-weight:500">
<span><i class="ok"></i>Mensalidade fixa, sem comissão</span><span><i class="ok"></i>Com a marca da sua central</span><span><i class="ok"></i>Planos a partir de <span class="mono" style="font-size:38px">R$ 149</span>/mês</span></div>
<div style="position:absolute;left:90px;right:90px;top:1200px;background:var(--papel);color:var(--asfalto);border-radius:28px;padding:38px 46px">
<div style="font-size:30px;font-weight:600;color:var(--t2)">Agende uma demonstração</div>
<div style="font-size:50px;font-weight:600;letter-spacing:-0.03em;margin-top:8px">entregapramim.impulsiodigital.com</div>
<div class="mono" style="font-size:34px;margin-top:14px;color:var(--t2)">WhatsApp (32) 99857-8057</div></div>'''
    else:
        x, y, w, h = c['x'], c['y'], c['w'], c['h']
        sy = c['sy']
        img = f'<img src="{c["img"]}" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:20px;object-fit:cover;object-position:top">' if c.get('img') else ''
        body = f'''<div class="n">{c['n']}/4</div>
<h1 class="t">{c['t']}</h1>
<p class="s" style="top:{sy}px">{c['s']}</p>
<div class="card" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"></div>{img}
<div class="cap" style="top:{y + h + 26}px">{c['cap']} · dados ilustrativos</div>'''
    open(f'{k}.html', 'w').write(HEAD + body + '</body></html>')
print('cenas geradas')
