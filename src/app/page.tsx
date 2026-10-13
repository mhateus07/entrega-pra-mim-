import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { buttonClass } from '@/components/ui/Button'
import NaTela from '@/components/brand/NaTela'
import OperacaoAoVivo from '@/components/landing/OperacaoAoVivo'
import AntesDepois from '@/components/landing/AntesDepois'
import ComoFunciona from '@/components/landing/ComoFunciona'
import RastreioMarca from '@/components/landing/RastreioMarca'
import FechamentoDemo from '@/components/landing/FechamentoDemo'
import { LIMITES_PLANO, VALOR_ENTREGA_EXCEDENTE } from '@/lib/planos'
import { formatarMoeda } from '@/lib/pricing'
import { cn } from '@/utils/cn'

// Landing para o dono da central de motofrete (modelo SaaS, docs/PLANO_NEGOCIO.md).
// Identidade "Chegada": brand/README.md. O laranja marca só o que está acontecendo
// agora (a moto, a rota percorrida) e a ação principal.

const fatos = [
  { valor: '90 s', texto: 'para o motoboy aceitar a oferta antes de ela passar ao próximo' },
  { valor: '0%', texto: 'de comissão por corrida: o valor é todo da sua central' },
  { valor: '1 link', texto: 'para o destinatário acompanhar, sem baixar app nem criar conta' },
]

const recursos = [
  { titulo: 'Despacho com prazo', texto: 'A corrida vai ao motoboy de melhor posição. Ninguém aceitou em 90 segundos? Passa ao próximo. Depois de 3 tentativas, cai na sua fila.' },
  { titulo: 'Rastreio sem app', texto: 'O destinatário acompanha pelo celular. Telefone, documento e endereço completo do motoboy ficam de fora.' },
  { titulo: 'Comprovante com foto', texto: 'A entrega só fecha com a foto no destino. Ela fica no pedido e no link do cliente, e acaba com o "não recebi".' },
  { titulo: 'Portal da empresa cliente', texto: 'A farmácia, a loja e o escritório abrem o pedido e acompanham sem ligar para a central.' },
  { titulo: 'Tabela de preço sua', texto: 'Valor por km, corrida mínima, acréscimo por serviço e preço fixo por bairro. Cada central cobra do seu jeito.' },
  { titulo: 'Fechamento do dia', texto: 'Repasse de cada motoboy já descontando o dinheiro em mãos, e o valor a cobrar de cada empresa. Exporta para Excel.' },
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

function TituloSecao({ rotulo, children, className, claro }: { rotulo: string; children: React.ReactNode; className?: string; claro?: boolean }) {
  return (
    <NaTela className={className}>
      <p className={cn('chega text-[14px] font-medium', claro ? 'text-white/55' : 'text-fg-3')}>{rotulo}</p>
      <h2 className={cn('chega titulo-display mt-3 text-[34px] sm:text-[44px]', claro ? 'text-white' : 'text-fg')} style={{ '--atraso': '0.06s' } as React.CSSProperties}>{children}</h2>
    </NaTela>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Entrega Pra Mim — início"><Logo /></Link>
          <nav className="hidden items-center gap-7 text-[14px] text-fg-2 md:flex" aria-label="Seções">
            <a href="#como-funciona" className="hover:text-fg">Como funciona</a>
            <a href="#rastreio" className="hover:text-fg">Rastreio</a>
            <a href="#fechamento" className="hover:text-fg">Fechamento</a>
            <a href="#planos" className="hover:text-fg">Planos</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/login" className={buttonClass('ghost', 'md', 'hidden sm:inline-flex')}>Entrar</Link>
            <Link href="/registro" className={buttonClass('brand', 'md')}><span className="sm:hidden">Começar</span><span className="hidden sm:inline">Criar minha central</span></Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: a operação de uma central rodando, em 3D, nas ruas reais de Juiz de Fora */}
        <section className="entrada relative isolate flex flex-col lg:block lg:h-[min(88vh,840px)] lg:min-h-[640px]">
          <OperacaoAoVivo className="order-last h-[480px] sm:h-[540px] lg:absolute lg:inset-0 lg:h-auto" />
          <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,var(--page)_0%,color-mix(in_oklab,var(--page)_86%,transparent)_34%,transparent_62%)] lg:block" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-t from-page to-transparent lg:block" aria-hidden="true" />
          <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-center px-4 pb-10 pt-12 sm:px-6 lg:py-0">
            <div className="max-w-[540px]">
              <p className="chega text-[14px] font-medium text-fg-3">Sistema para centrais de motofrete</p>
              <h1 className="chega titulo-display mt-4 text-[42px] text-fg sm:text-[58px]" style={{ '--atraso': '0.08s' } as React.CSSProperties}>
                Cada corrida da sua central, do aceite à foto no destino.
              </h1>
              <p className="chega mt-6 max-w-[470px] text-[17px] leading-relaxed text-fg-2" style={{ '--atraso': '0.18s' } as React.CSSProperties}>
                Despacho automático, rastreio com a sua marca e o fechamento do dia em minutos. Mensalidade fixa, sem comissão por corrida.
              </p>
              <div className="chega mt-8 flex flex-col gap-3 sm:flex-row" style={{ '--atraso': '0.28s' } as React.CSSProperties}>
                <Link href="/registro" className={buttonClass('brand', 'lg', 'group')}>
                  Criar minha central <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#como-funciona" className={buttonClass('outline', 'lg', 'bg-page/60 backdrop-blur')}>Ver como funciona</a>
              </div>
            </div>
          </div>
        </section>

        {/* Três números do produto */}
        <section className="border-y border-line">
          <dl className="mx-auto grid max-w-6xl divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
            {fatos.map((f) => (
              <div key={f.valor} className="flex items-baseline gap-4 py-6 md:block md:px-8 md:first:pl-0 md:last:pr-0">
                <dt className="shrink-0 font-mono text-[28px] font-medium tabular text-fg">{f.valor}</dt>
                <dd className="text-[14.5px] leading-snug text-fg-2 md:mt-2">{f.texto}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Antes e depois: o grupo de WhatsApp */}
        <section className="bg-[#121314] text-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-28">
            <NaTela>
              <p className="chega text-[14px] font-medium text-white/55">O jeito de hoje</p>
              <h2 className="chega titulo-display mt-3 text-[38px] sm:text-[52px]" style={{ '--atraso': '0.06s' } as React.CSSProperties}>
                Ainda despachando corrida no grupo do WhatsApp?
              </h2>
              <p className="chega mt-6 max-w-md text-[17px] leading-relaxed text-white/65" style={{ '--atraso': '0.16s' } as React.CSSProperties}>
                No Entrega Pra Mim, cada corrida tem dono, rota e comprovante. Ninguém pega a mesma entrega duas vezes, e ninguém pergunta &quot;quem pegou?&quot;.
              </p>
            </NaTela>
            <AntesDepois />
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
          <TituloSecao rotulo="Como funciona">Da coleta ao entregue, sem grupo e sem caderno</TituloSecao>
          <ComoFunciona />
        </section>

        {/* Recursos */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <TituloSecao rotulo="O que a central ganha" className="lg:sticky lg:top-28 lg:self-start">Tudo que hoje está no WhatsApp, no telefone e no caderno</TituloSecao>
            <NaTela as="dl" className="divide-y divide-line border-y border-line">
              {recursos.map(({ titulo, texto }, i) => (
                <div key={titulo} className="chega grid gap-1 py-6 sm:grid-cols-[200px_1fr] sm:gap-8" style={{ '--atraso': `${i * 0.05}s` } as React.CSSProperties}>
                  <dt className="text-[16px] font-semibold text-fg">{titulo}</dt>
                  <dd className="text-[15.5px] leading-relaxed text-fg-2">{texto}</dd>
                </div>
              ))}
            </NaTela>
          </div>
        </section>

        {/* Rastreio com a marca */}
        <section id="rastreio" className="mx-auto grid max-w-6xl scroll-mt-20 gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <TituloSecao rotulo="Rastreio com a sua marca">O cliente final vê a sua central, não a gente</TituloSecao>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-fg-2">
              Todo pedido gera um link para o destinatário acompanhar. No plano Marca Própria, ele chega com o seu logo, o seu nome e a sua cor. O Entrega Pra Mim aparece só no rodapé.
            </p>
            <ul className="mt-8 max-w-md divide-y divide-line border-y border-line text-[15px] text-fg-2">
              {['Posição do motoboy só durante a entrega', 'Foto do comprovante depois de entregue', 'App instalável com o ícone da central'].map((t) => (
                <li key={t} className="py-3">{t}</li>
              ))}
            </ul>
          </div>
          <RastreioMarca />
        </section>

        {/* Fechamento */}
        <section id="fechamento" className="scroll-mt-20 border-y border-line bg-surface-2">
          <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <TituloSecao rotulo="Fechamento">O acerto do dia sai em minutos, não no caderno</TituloSecao>
              <p className="mt-5 max-w-md text-[17px] leading-relaxed text-fg-2">
                Quantas corridas cada motoboy fez, quanto repassar já descontando o dinheiro que ficou com ele e quanto cobrar de cada empresa. Sem discussão no fim do expediente.
              </p>
            </div>
            <FechamentoDemo />
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <TituloSecao rotulo="Planos" className="max-w-2xl">Preço fixo por mês, sem comissão por corrida</TituloSecao>
          <p className="mt-4 max-w-xl text-fg-2">Mensalidade por central, sem fidelidade. Implantação presencial cobrada uma vez.</p>
          <NaTela className="mt-12 grid gap-4 lg:grid-cols-3">
            {planos.map((p, i) => (
              <div
                key={p.id}
                className={cn('chega flex flex-col rounded-xl p-7', p.destaque ? 'bg-[#121314] text-white' : 'border border-line bg-surface')}
                style={{ '--atraso': `${i * 0.08}s` } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('text-[15px] font-semibold', p.destaque ? 'text-white' : 'text-fg')}>{p.nome}</p>
                  {p.destaque && <span className="text-[13px] text-white/55">Mais escolhido</span>}
                </div>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="font-mono text-[38px] font-medium leading-none tabular">{formatarMoeda(p.precoMensal).replace(',00', '')}</span>
                  <span className={p.destaque ? 'text-white/55' : 'text-fg-3'}>/mês</span>
                </p>
                <p className={cn('mt-3 text-sm', p.destaque ? 'text-white/70' : 'text-fg-2')}>
                  Até <span className="font-mono">{p.motoboys}</span> motoboys e <span className="font-mono">{p.entregasMes.toLocaleString('pt-BR')}</span> entregas/mês
                </p>
                <ul className={cn('mt-6 flex-1 divide-y border-t text-[15px]', p.destaque ? 'divide-white/10 border-white/10 text-white/85' : 'divide-line border-line text-fg-2')}>
                  {p.inclui.map((item) => <li key={item} className="py-2.5">{item}</li>)}
                </ul>
                <Link href="/registro" className={buttonClass(p.destaque ? 'brand' : 'outline', 'lg', 'mt-7 w-full')}>Começar</Link>
              </div>
            ))}
          </NaTela>
          <p className="mt-5 text-sm text-fg-3">
            Passou do limite de entregas? <span className="font-mono">{formatarMoeda(VALOR_ENTREGA_EXCEDENTE)}</span> por entrega excedente, ou mude de plano quando quiser.
          </p>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          <TituloSecao rotulo="Dúvidas">O que os donos de central perguntam</TituloSecao>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {perguntas.map((p) => (
              <details key={p.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold text-fg">
                  {p.q}
                  <span className="relative h-4 w-4 shrink-0" aria-hidden="true">
                    <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-fg" />
                    <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-fg transition-transform duration-300 group-open:scale-y-0" />
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-fg-2">{p.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Fecho */}
        <section className="bg-[#121314] text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 px-4 py-20 sm:px-6 lg:flex-row lg:items-end">
            <NaTela>
              <p className="chega text-[14px] font-medium text-white/55">Implantação presencial, com a sua equipe</p>
              <p className="chega titulo-display mt-3 max-w-xl text-[38px] sm:text-[52px]" style={{ '--atraso': '0.08s' } as React.CSSProperties}>
                Sua central no sistema ainda esta semana.
              </p>
            </NaTela>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-[10px] border border-white/25 px-5 text-[15px] font-semibold text-white hover:bg-white/10">Entrar</Link>
              <Link href="/registro" className={buttonClass('brand', 'lg')}>Criar minha central <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:px-6">
              <Logo className="text-white" />
              <p>© {new Date().getFullYear()} Entrega Pra Mim · Mapa © OpenStreetMap</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
