import Link from 'next/link'
import { ArrowRight, Calculator, Camera, Check, ClipboardList, Link2, MessageSquareOff, Palette, Radio, Tags, Users } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { buttonClass } from '@/components/ui/Button'
import { LIMITES_PLANO, VALOR_ENTREGA_EXCEDENTE } from '@/lib/planos'
import { formatarMoeda } from '@/lib/pricing'

// Landing para o dono da central de motofrete (modelo SaaS, docs/PLANO_NEGOCIO.md)

const dores = [
  'Corridas distribuídas no grupo de WhatsApp, quem responde primeiro leva',
  'Cliente ligando para saber "cadê meu motoboy?"',
  'Fechamento do dia no caderno e briga sobre quantas corridas cada um fez',
  'Fim do mês montando planilha para cobrar cada empresa',
]

const passos = [
  { titulo: 'Cadastre a equipe e os clientes', texto: 'Motoboys e empresas atendidas entram por um link de convite que você manda no WhatsApp. Cada um com o próprio acesso.' },
  { titulo: 'O pedido chega e o sistema despacha', texto: 'A empresa abre o pedido sozinha ou sua equipe lança. O sistema oferece a corrida ao motoboy mais perto e, se ele não aceitar em 90 segundos, passa ao próximo.' },
  { titulo: 'Rastreio, comprovante e fechamento', texto: 'O cliente final acompanha por um link com a sua marca. A entrega fecha com foto. No fim do dia você sabe quanto pagar e quanto cobrar.' },
]

const recursos = [
  { icon: Radio, titulo: 'Despacho com oferta', texto: 'A corrida vai para o motoboy de melhor posição, com prazo para aceitar. Ninguém aceitou? Ela cai na sua fila para atribuir na mão.' },
  { icon: Link2, titulo: 'Link de rastreio', texto: 'O destinatário acompanha a entrega sem baixar nada e sem criar conta. Nada de telefone ou endereço completo exposto.' },
  { icon: Camera, titulo: 'Comprovante com foto', texto: 'O motoboy registra a entrega no destino. A foto fica no pedido e no link do cliente.' },
  { icon: Calculator, titulo: 'Fechamento em minutos', texto: 'Por motoboy: corridas, repasse e acerto do dinheiro recebido. Por empresa: quanto cobrar. Exporta para Excel.' },
  { icon: Users, titulo: 'Portal da empresa cliente', texto: 'A farmácia, a loja ou o escritório abre o pedido sozinho e acompanha tudo, sem ligar para a central.' },
  { icon: Tags, titulo: 'A tabela de preço é sua', texto: 'Valor por km, corrida mínima, acréscimo por tipo de serviço e preço fixo por bairro. Cada central cobra do seu jeito.' },
]

const perguntas = [
  { q: 'Vocês ficam com uma parte da corrida?', a: 'Não. Você paga uma mensalidade fixa pelo plano. O valor da corrida é da sua central, e a relação com seus clientes e motoboys também.' },
  { q: 'Meus motoboys precisam instalar um aplicativo?', a: 'Não precisa ir à loja de apps. O sistema abre no navegador do celular e pode ser instalado na tela inicial como um app, com o link da sua central.' },
  { q: 'E o pagamento das corridas?', a: 'Sua central continua cobrando os clientes como já cobra. O fechamento mostra quanto cada empresa deve no período e quanto repassar a cada motoboy, já descontando o dinheiro que ele recebeu em mãos.' },
  { q: 'Como é a implantação?', a: 'Cadastramos com você os motoboys, as empresas clientes e a tabela de preço, e treinamos a equipe pessoalmente. A implantação é cobrada uma única vez.' },
  { q: 'E se passar do limite de entregas do plano?', a: `As entregas continuam funcionando. O que passar do limite conta como excedente (${formatarMoeda(VALOR_ENTREGA_EXCEDENTE)} por entrega) ou você muda de plano. Só bloqueamos novos pedidos acima de 120% do limite, e você é avisado antes no painel.` },
]

const planos = (['ESSENCIAL', 'CENTRAL', 'MARCA_PROPRIA'] as const).map((p) => ({
  id: p,
  ...LIMITES_PLANO[p],
  destaque: p === 'CENTRAL',
  inclui: {
    ESSENCIAL: ['Despacho com oferta', 'Link de rastreio e comprovante com foto', 'Fechamento por motoboy e por cliente'],
    CENTRAL: ['Tudo do Essencial', 'Portal para as empresas clientes', 'Tabela de preço por bairro'],
    MARCA_PROPRIA: ['Tudo do Central', 'Seu logo, nome e cor no rastreio', 'App com a marca da central'],
  }[p],
}))

function Preview() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-fg-3">Painel da central · hoje</p>
            <p className="text-[15px] font-semibold text-fg">Despacho</p>
          </div>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-brand-soft px-2 text-xs font-medium text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> 6 motoboys online
          </span>
        </div>

        <ul className="mt-5 space-y-2.5 text-sm">
          {[
            { cod: '#A7K29Q', rota: 'Centro → São Mateus', status: 'Oferecido a Rafael · 52s', cor: 'text-brand' },
            { cod: '#B3M81X', rota: 'Alto dos Passos → Cascatinha', status: 'Em entrega · Carla', cor: 'text-success' },
            { cod: '#C9P40L', rota: 'Granbery → Benfica', status: 'Entregue 14:21 · foto', cor: 'text-fg-3' },
          ].map((p) => (
            <li key={p.cod} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
              <div className="min-w-0">
                <p className="font-mono text-[12px] text-fg-3">{p.cod}</p>
                <p className="truncate text-fg">{p.rota}</p>
              </div>
              <span className={`shrink-0 text-xs font-medium ${p.cor}`}>{p.status}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
          {[['38', 'corridas'], ['R$ 612', 'a cobrar'], ['R$ 428', 'repasses']].map(([v, l]) => (
            <div key={l}>
              <p className="text-lg font-semibold tabular text-fg">{v}</p>
              <p className="text-xs text-fg-3">{l}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-fg-3">Ilustração do painel da central</p>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Entrega Pra Mim — início"><Logo /></Link>
          <nav className="hidden items-center gap-7 text-sm text-fg-2 md:flex" aria-label="Seções">
            <a href="#como-funciona" className="hover:text-fg">Como funciona</a>
            <a href="#recursos" className="hover:text-fg">Recursos</a>
            <a href="#planos" className="hover:text-fg">Planos</a>
            <a href="#duvidas" className="hover:text-fg">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/login" className={buttonClass('ghost', 'md', 'hidden sm:inline-flex')}>Entrar</Link>
            <Link href="/registro" className={buttonClass('primary', 'md')}>Criar minha central</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-fg-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Sistema para centrais de motofrete
            </p>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-fg sm:text-[52px]">
              Sua central despachando, rastreando e fechando o dia num sistema só.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-fg-2">
              Com a sua marca, por preço fixo. <span className="font-medium text-fg">Sem comissão por corrida.</span> A frota e os clientes continuam sendo seus.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/registro" className={buttonClass('brand', 'lg')}>
                Criar minha central <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#como-funciona" className={buttonClass('outline', 'lg')}>Ver como funciona</a>
            </div>
            <ul className="mt-10 grid gap-3 text-sm text-fg-2 sm:grid-cols-3">
              {['Despacho automático', 'Rastreio com sua marca', 'Fechamento por motoboy'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
          <Preview />
        </section>

        {/* Dor */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <MessageSquareOff className="h-6 w-6 text-brand" aria-hidden="true" />
              <h2 className="mt-4 text-[28px] font-semibold tracking-tight text-fg">Largue o grupo de WhatsApp sem largar o jeito da sua central</h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {dores.map((d) => (
                <li key={d} className="rounded-xl border border-line bg-page p-4 text-[15px] text-fg-2">{d}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-[32px] font-semibold tracking-tight text-fg">Como funciona</h2>
            <p className="mt-3 text-fg-2">Tudo pelo navegador, no computador da central e no celular dos motoboys.</p>
          </div>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
            {passos.map((p, i) => (
              <li key={p.titulo} className="bg-surface p-7">
                <span className="font-mono text-sm text-brand">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-fg">{p.titulo}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-2">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Recursos */}
        <section id="recursos" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="max-w-2xl text-[32px] font-semibold tracking-tight text-fg">O que a sua central ganha</h2>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {recursos.map(({ icon: Icon, titulo, texto }) => (
                <div key={titulo}>
                  <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-fg">{titulo}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-fg-2">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-[32px] font-semibold tracking-tight text-fg">Planos com preço fixo</h2>
            <p className="mt-3 text-fg-2">Mensalidade por central. Sem taxa por corrida e sem fidelidade. Implantação presencial cobrada uma vez.</p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {planos.map((p) => (
              <div key={p.id} className={`flex flex-col rounded-2xl border bg-surface p-6 ${p.destaque ? 'border-fg ring-1 ring-fg' : 'border-line'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-fg">{p.nome}</h3>
                  {p.id === 'MARCA_PROPRIA' && <Palette className="h-4 w-4 text-brand" aria-hidden="true" />}
                </div>
                <p className="mt-4"><span className="text-[32px] font-semibold tracking-tight tabular text-fg">{formatarMoeda(p.precoMensal)}</span><span className="text-fg-3">/mês</span></p>
                <p className="mt-2 text-sm text-fg-2">Até {p.motoboys} motoboys e {p.entregasMes.toLocaleString('pt-BR')} entregas por mês</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-[15px] text-fg-2">
                  {p.inclui.map((i) => (
                    <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />{i}</li>
                  ))}
                </ul>
                <Link href="/registro" className={buttonClass(p.destaque ? 'brand' : 'outline', 'md', 'mt-6 w-full')}>Começar</Link>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-fg-3">
            <ClipboardList className="h-4 w-4" aria-hidden="true" /> Entrega acima do limite: {formatarMoeda(VALOR_ENTREGA_EXCEDENTE)} cada, ou mude de plano quando quiser.
          </p>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <h2 className="text-[32px] font-semibold tracking-tight text-fg">Dúvidas frequentes</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {perguntas.map((p) => (
              <details key={p.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-fg">
                  {p.q}
                  <span className="text-xl leading-none text-fg-3 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{p.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-fg">Sua central no sistema esta semana</h2>
              <p className="mt-1 text-fg-2">Crie a conta da central. Nossa equipe entra em contato para ativar e fazer a implantação com você.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/login" className={buttonClass('outline', 'lg')}>Entrar</Link>
              <Link href="/registro" className={buttonClass('brand', 'lg')}>Criar minha central</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-fg-3 sm:flex-row sm:items-center sm:px-6">
          <Logo className="[&>span:last-child]:text-fg-2" markClassName="h-6 w-6" />
          <p>© {new Date().getFullYear()} Entrega Pra Mim. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
