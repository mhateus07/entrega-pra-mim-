import Link from 'next/link'
import { ArrowRight, Calculator, Camera, Link2, Radio, Tags, Users } from 'lucide-react'
import Logo, { LogoMark, LogoWordmark } from '@/components/brand/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { buttonClass } from '@/components/ui/Button'
import Faixa from '@/components/brand/Faixa'
import NaTela from '@/components/brand/NaTela'
import DespachoAoVivo from '@/components/landing/DespachoAoVivo'
import AntesDepois from '@/components/landing/AntesDepois'
import ComoFunciona from '@/components/landing/ComoFunciona'
import RastreioMarca from '@/components/landing/RastreioMarca'
import FechamentoDemo from '@/components/landing/FechamentoDemo'
import { LIMITES_PLANO, VALOR_ENTREGA_EXCEDENTE } from '@/lib/planos'
import { formatarMoeda } from '@/lib/pricing'
import { cn } from '@/utils/cn'

// Landing para o dono da central de motofrete (modelo SaaS, docs/PLANO_NEGOCIO.md).
// Identidade: brand/README.md — a rota que termina em entregue.

const recursos = [
  { icon: Radio, rotulo: 'Despacho', titulo: 'Oferta com prazo', texto: 'A corrida vai ao motoboy de melhor posição. Ninguém aceitou em 90 segundos? Passa ao próximo. Depois de 3 tentativas, cai na sua fila.' },
  { icon: Link2, rotulo: 'Rastreio', titulo: 'Link sem app, sem conta', texto: 'O destinatário acompanha pelo celular. Nada de telefone, documento ou endereço completo exposto.' },
  { icon: Camera, rotulo: 'Comprovante', titulo: 'Foto no destino', texto: 'A entrega só fecha com a foto. Ela fica no pedido e no link do cliente: fim do "não recebi".' },
  { icon: Users, rotulo: 'Portal', titulo: 'A empresa pede sozinha', texto: 'A farmácia, a loja e o escritório abrem o pedido e acompanham, sem ligar para a central.' },
  { icon: Tags, rotulo: 'Preço', titulo: 'A tabela é sua', texto: 'Valor por km, corrida mínima, acréscimo por serviço e preço fixo por bairro. Cada central cobra do seu jeito.' },
  { icon: Calculator, rotulo: 'Fechamento', titulo: 'Acerto em minutos', texto: 'Repasse de cada motoboy descontando o dinheiro em mãos e o valor a cobrar de cada empresa. Exporta para Excel.' },
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
      <span className="regua" />
      <p className={cn('rotulo mt-4', claro ? 'text-white/60' : 'text-fg-3')}>{rotulo}</p>
      <h2 className={cn('titulo-display mt-2 text-[38px] sm:text-[48px]', claro ? 'text-white' : 'text-fg')}>{children}</h2>
    </NaTela>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-page">
      <Faixa className="h-[10px]" />
      <header className="sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Entrega Pra Mim — início"><Logo /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-fg-2 md:flex" aria-label="Seções">
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
        {/* Hero */}
        <section className="entrada mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20 [&>*]:min-w-0">
          <div>
            <p className="chega rotulo text-fg-3">Sistema para centrais de motofrete</p>
            <h1 className="titulo-display mt-5 text-[52px] sm:text-[76px] lg:text-[84px]">
              <span className="chega block" style={{ '--atraso': '0.08s' } as React.CSSProperties}>Despacha.</span>
              <span className="chega block" style={{ '--atraso': '0.2s' } as React.CSSProperties}>Rastreia.</span>
              <span className="chega block text-brand-mark" style={{ '--atraso': '0.32s' } as React.CSSProperties}>Fecha o dia.</span>
            </h1>
            <p className="chega mt-7 max-w-lg text-lg leading-relaxed text-fg-2" style={{ '--atraso': '0.45s' } as React.CSSProperties}>
              Sua central num sistema só, com a sua marca e preço fixo. <span className="font-semibold text-fg">Sem comissão por corrida.</span> A frota e os clientes continuam sendo seus.
            </p>
            <div className="chega mt-8 flex flex-col gap-3 sm:flex-row" style={{ '--atraso': '0.55s' } as React.CSSProperties}>
              <Link href="/registro" className={buttonClass('brand', 'lg', 'group')}>
                Criar minha central <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#como-funciona" className={buttonClass('outline', 'lg')}>Ver como funciona</a>
            </div>
          </div>
          <div className="chega" style={{ '--atraso': '0.25s' } as React.CSSProperties}>
            <DespachoAoVivo />
          </div>
        </section>

        {/* Antes e depois: o grupo de WhatsApp */}
        <section className="bg-[#141413] text-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-28">
            <NaTela>
              <h2 className="cartaz text-[56px] sm:text-[80px]">
                <span className="chega block">Ainda</span>
                <span className="chega block" style={{ '--atraso': '0.08s' } as React.CSSProperties}>despachando</span>
                <span className="chega block" style={{ '--atraso': '0.16s' } as React.CSSProperties}>corrida no</span>
                <span className="chega block text-brand-mark" style={{ '--atraso': '0.24s' } as React.CSSProperties}>grupo do</span>
                <span className="chega block text-brand-mark" style={{ '--atraso': '0.32s' } as React.CSSProperties}>WhatsApp?</span>
              </h2>
              <p className="chega mt-8 max-w-md text-lg text-white/70" style={{ '--atraso': '0.45s' } as React.CSSProperties}>
                Com o Entrega Pra Mim, cada corrida tem <span className="font-semibold text-white">dono, rota e comprovante</span>. E o fechamento sai em minutos.
              </p>
            </NaTela>
            <AntesDepois />
          </div>
          <Faixa />
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
          <TituloSecao rotulo="Como funciona">Da coleta ao entregue, sem grupo e sem caderno</TituloSecao>
          <ComoFunciona />
        </section>

        {/* Recursos */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <TituloSecao rotulo="O que a central ganha" className="max-w-2xl">Tudo que hoje está no WhatsApp, no telefone e no caderno</TituloSecao>
            <NaTela className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {recursos.map(({ icon: Icon, rotulo, titulo, texto }, i) => (
                <div key={titulo} className="chega group bg-surface p-7 transition-colors hover:bg-page" style={{ '--atraso': `${i * 0.06}s` } as React.CSSProperties}>
                  <div className="flex items-center justify-between">
                    <p className="rotulo text-fg-3"><span className="font-mono">0{i + 1}</span> · {rotulo}</p>
                    <Icon className="h-5 w-5 text-brand-mark transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </div>
                  <h3 className="titulo-display mt-6 text-[26px] text-fg">{titulo}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-fg-2">{texto}</p>
                </div>
              ))}
            </NaTela>
          </div>
        </section>

        {/* Rastreio com a marca */}
        <section id="rastreio" className="mx-auto grid max-w-6xl scroll-mt-20 gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <TituloSecao rotulo="Rastreio com a sua marca">O cliente final vê a sua central, não a gente</TituloSecao>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-fg-2">
              Todo pedido gera um link para o destinatário acompanhar. No plano Marca própria, ele chega com o seu logo, o seu nome e a sua cor. O Entrega Pra Mim aparece só no rodapé.
            </p>
            <ul className="mt-8 space-y-3 text-[15px] text-fg-2">
              {['Posição do motoboy só durante a entrega', 'Foto do comprovante depois de entregue', 'App instalável com o ícone da central'].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-mark" aria-hidden="true" />{t}
                </li>
              ))}
            </ul>
          </div>
          <RastreioMarca />
        </section>

        {/* Fechamento */}
        <section id="fechamento" className="scroll-mt-20 border-y border-line bg-surface-2">
          <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <TituloSecao rotulo="Fechamento">Fecha o dia em minutos, não no caderno</TituloSecao>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-fg-2">
                Quantas corridas cada motoboy fez, quanto repassar já descontando o dinheiro que ficou com ele e quanto cobrar de cada empresa. Sem discussão no fim do expediente.
              </p>
            </div>
            <FechamentoDemo />
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <TituloSecao rotulo="Planos" className="max-w-2xl">Preço fixo. Sem comissão por corrida.</TituloSecao>
          <p className="mt-4 max-w-xl text-fg-2">Mensalidade por central, sem fidelidade. Implantação presencial cobrada uma vez.</p>
          <NaTela className="mt-12 grid gap-4 lg:grid-cols-3">
            {planos.map((p, i) => (
              <div
                key={p.id}
                className={cn('chega flex flex-col rounded-2xl p-7', p.destaque ? 'bg-[#141413] text-white shadow-pop' : 'border border-line bg-surface')}
                style={{ '--atraso': `${i * 0.08}s` } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('rotulo', p.destaque ? 'text-white/60' : 'text-fg-3')}>{p.nome}</p>
                  {p.destaque && <span className="rounded-md bg-brand-mark px-2 py-0.5 rotulo text-white">Mais escolhido</span>}
                </div>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="font-mono text-[40px] font-medium leading-none tabular">{formatarMoeda(p.precoMensal).replace(',00', '')}</span>
                  <span className={p.destaque ? 'text-white/60' : 'text-fg-3'}>/mês</span>
                </p>
                <p className={cn('mt-3 text-sm', p.destaque ? 'text-white/70' : 'text-fg-2')}>
                  Até <span className="font-mono">{p.motoboys}</span> motoboys e <span className="font-mono">{p.entregasMes.toLocaleString('pt-BR')}</span> entregas/mês
                </p>
                <ul className={cn('mt-6 flex-1 space-y-3 border-t pt-6 text-[15px]', p.destaque ? 'border-white/15 text-white/85' : 'border-line text-fg-2')}>
                  {p.inclui.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-full', p.destaque ? 'bg-brand-mark' : 'border-2 border-fg')} aria-hidden="true" />{item}
                    </li>
                  ))}
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
        <section className="bg-[#141413] text-white">
          <Faixa reflexo="sempre" />
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 px-4 py-20 sm:px-6 lg:flex-row lg:items-end">
            <NaTela>
              <p className="chega rotulo text-white/60">Sua central no sistema esta semana</p>
              <p className="titulo-display mt-4 text-[48px] sm:text-[64px]">
                <span className="chega block" style={{ '--atraso': '0.08s' } as React.CSSProperties}>Despacha. Rastreia.</span>
                <span className="chega block text-brand-mark" style={{ '--atraso': '0.18s' } as React.CSSProperties}>Fecha o dia.</span>
              </p>
            </NaTela>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-[10px] border border-white/25 px-5 text-[15px] font-semibold text-white hover:bg-white/10">Entrar</Link>
              <Link href="/registro" className={buttonClass('brand', 'lg')}>Criar minha central <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:px-6">
              <span className="inline-flex items-center gap-2.5 text-white"><LogoMark className="h-7 w-7" /><LogoWordmark /></span>
              <p>© {new Date().getFullYear()} Entrega Pra Mim. Todos os direitos reservados.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
