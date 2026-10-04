import Link from 'next/link'
import { ArrowRight, Camera, Check, Clock, FileText, MapPin, MessageSquare, Receipt, ShieldCheck, Zap, CalendarClock, Wallet } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { buttonClass } from '@/components/ui/Button'
import PriceCalculator from '@/components/landing/PriceCalculator'
import { PRECO_POR_KM, MULTIPLICADORES, formatarMoeda } from '@/lib/pricing'

const servicos = [
  {
    tipo: 'AGENDADA' as const,
    icon: CalendarClock,
    nome: 'Agendada',
    texto: 'Você escolhe data e horário da coleta. Ideal para rotinas e envios planejados.',
  },
  {
    tipo: 'DOCUMENTOS' as const,
    icon: FileText,
    nome: 'Documentos',
    texto: 'Para contratos, chaves e papéis importantes, com comprovante de recebimento.',
  },
  {
    tipo: 'EXPRESSA' as const,
    icon: Zap,
    nome: 'Expressa',
    texto: 'Coleta imediata com prioridade na fila. Para o que não pode esperar.',
  },
]

const passos = [
  { titulo: 'Informe os endereços', texto: 'Coleta, entrega e o tipo de serviço. O preço aparece antes de você confirmar.' },
  { titulo: 'Pague e acompanhe', texto: 'Pix ou cartão. Um entregador aceita o pedido e você acompanha o trajeto no mapa.' },
  { titulo: 'Receba o comprovante', texto: 'A entrega é registrada com foto e fica salva no histórico do pedido.' },
]

const recursos = [
  { icon: Receipt, titulo: 'Preço transparente', texto: 'Cálculo por quilômetro rodado, sem taxas escondidas.' },
  { icon: MapPin, titulo: 'Rastreamento ao vivo', texto: 'Localização do entregador atualizada durante todo o trajeto.' },
  { icon: MessageSquare, titulo: 'Chat no pedido', texto: 'Fale direto com o entregador sem expor seu telefone.' },
  { icon: Camera, titulo: 'Foto na entrega', texto: 'Comprovante registrado pelo entregador no destino.' },
  { icon: ShieldCheck, titulo: 'Entregadores cadastrados', texto: 'CNH e veículo registrados antes de receber pedidos.' },
  { icon: Clock, titulo: 'Histórico completo', texto: 'Todos os pedidos, valores e horários em um só lugar.' },
]

const perguntas = [
  {
    q: 'Como o preço é calculado?',
    a: `A base é ${formatarMoeda(PRECO_POR_KM)} por km do trajeto. Entregas de documentos têm acréscimo de ${Math.round((MULTIPLICADORES.DOCUMENTOS - 1) * 100)}% e expressas de ${Math.round((MULTIPLICADORES.EXPRESSA - 1) * 100)}%. O valor aparece antes da confirmação.`,
  },
  { q: 'Quais formas de pagamento são aceitas?', a: 'Pix e cartão de crédito ou débito, direto na plataforma.' },
  { q: 'Consigo acompanhar a entrega?', a: 'Sim. Depois que um entregador aceita o pedido, a localização dele aparece no mapa até a conclusão da entrega.' },
  { q: 'Como me torno entregador?', a: 'Crie uma conta como entregador informando CNH e dados do veículo. Depois disso você já pode ficar disponível e aceitar pedidos.' },
]

function Preview() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[13px] text-fg-3">#A7K29Q</p>
            <p className="text-[15px] font-semibold text-fg">Entrega expressa</p>
          </div>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-brand-soft px-2 text-xs font-medium text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> Em rota
          </span>
        </div>

        <div className="relative mt-5 h-40 overflow-hidden rounded-xl border border-line bg-surface-2">
          <svg viewBox="0 0 400 160" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <g stroke="var(--border)" strokeWidth="10" fill="none">
              <path d="M-10 40 H 420" />
              <path d="M-10 118 H 420" />
              <path d="M90 -10 V 170" />
              <path d="M250 -10 V 170" />
              <path d="M330 -10 V 170" />
            </g>
            <path d="M60 118 H 250 V 40 H 345" fill="none" stroke="var(--fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M60 118 H 190" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="118" r="7" fill="var(--surface)" stroke="var(--fg)" strokeWidth="3" />
            <circle cx="345" cy="40" r="8" fill="var(--brand)" />
            <circle cx="190" cy="118" r="9" fill="var(--brand)" stroke="var(--surface)" strokeWidth="3" />
          </svg>
        </div>

        <ol className="mt-5 space-y-3 text-sm">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 text-fg-2"><span className="h-2.5 w-2.5 rounded-full border-2 border-fg" />Coleta · Centro</span>
            <span className="tabular text-fg-3">14:02</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 text-fg"><span className="h-2.5 w-2.5 rounded-full bg-brand" />Entrega · São Mateus</span>
            <span className="tabular text-fg-3">prev. 14:21</span>
          </li>
        </ol>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-fg-2">RS</span>
            <div>
              <p className="text-[13px] font-medium text-fg">Rafael S.</p>
              <p className="text-xs text-fg-3">Honda CG 160</p>
            </div>
          </div>
          <p className="text-lg font-semibold tabular text-fg">{formatarMoeda(6.4 * PRECO_POR_KM * MULTIPLICADORES.EXPRESSA)}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-fg-3">Ilustração da tela de acompanhamento</p>
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
            <a href="#precos" className="hover:text-fg">Preços</a>
            <a href="#entregadores" className="hover:text-fg">Para entregadores</a>
            <a href="#duvidas" className="hover:text-fg">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/login" className={buttonClass('ghost', 'md', 'hidden sm:inline-flex')}>Entrar</Link>
            <Link href="/registro" className={buttonClass('primary', 'md')}>Criar conta</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-fg-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Coleta e entrega urbana sob demanda
            </p>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-fg sm:text-[52px]">
              Sua entrega do ponto A ao ponto B, sem surpresa no preço.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-fg-2">
              Solicite um entregador em poucos passos, veja o valor antes de confirmar e acompanhe o trajeto até o comprovante de entrega.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/registro" className={buttonClass('brand', 'lg')}>
                Solicitar uma entrega <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#precos" className={buttonClass('outline', 'lg')}>Simular preço</a>
            </div>
            <ul className="mt-10 grid gap-3 text-sm text-fg-2 sm:grid-cols-3">
              {['Preço por km', 'Rastreamento ao vivo', 'Comprovante com foto'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
          <Preview />
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-[32px] font-semibold tracking-tight text-fg">Como funciona</h2>
              <p className="mt-3 text-fg-2">Três etapas, tudo pelo navegador. Não é preciso instalar nada.</p>
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
          </div>
        </section>

        {/* Serviços e preços */}
        <section id="precos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_440px] lg:items-start">
            <div>
              <h2 className="text-[32px] font-semibold tracking-tight text-fg">Serviços e preços</h2>
              <p className="mt-3 max-w-xl text-fg-2">
                Você paga pela distância do trajeto. O tipo de serviço define a prioridade e o valor por quilômetro.
              </p>
              <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-surface">
                {servicos.map((s) => {
                  const Icon = s.icon
                  return (
                    <div key={s.tipo} className="flex gap-4 p-5 sm:p-6">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2">
                        <Icon className="h-[18px] w-[18px] text-fg-2" aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-semibold text-fg">{s.nome}</h3>
                          <p className="text-sm text-fg-2">
                            <span className="text-lg font-semibold tabular text-fg">{formatarMoeda(PRECO_POR_KM * MULTIPLICADORES[s.tipo])}</span> / km
                          </p>
                        </div>
                        <p className="mt-1 text-[15px] text-fg-2">{s.texto}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <PriceCalculator />
          </div>
        </section>

        {/* Recursos */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="max-w-2xl text-[32px] font-semibold tracking-tight text-fg">Controle do pedido do início ao fim</h2>
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

        {/* Entregadores */}
        <section id="entregadores" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid overflow-hidden rounded-2xl bg-[#141413] text-white ring-1 ring-line dark:bg-surface-2 lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <p className="text-sm font-medium text-[#f0712b]">Para entregadores</p>
              <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight">Faça entregas no seu horário.</h2>
              <p className="mt-4 max-w-md text-white/70">
                Fique disponível quando quiser, aceite os pedidos que fazem sentido para você e acompanhe seus ganhos e saques pelo aplicativo.
              </p>
              <Link href="/registro?tipo=motoboy" className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-[15px] font-medium text-[#141413] hover:bg-white/90">
                Quero ser entregador <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="grid content-center gap-6 border-t border-white/10 p-8 sm:p-12 lg:border-l lg:border-t-0">
              {[
                { icon: Wallet, t: 'Ganhos visíveis', d: 'Saldo disponível, a liberar e histórico de cada corrida.' },
                { icon: MapPin, t: 'Rotas no mapa', d: 'Endereços de coleta e entrega com navegação.' },
                { icon: Clock, t: 'Sem escala fixa', d: 'Você decide quando ficar online.' },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5"><Icon className="h-4 w-4 text-white/80" /></span>
                  <div>
                    <p className="font-medium">{t}</p>
                    <p className="mt-0.5 text-sm text-white/60">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
              <h2 className="text-2xl font-semibold tracking-tight text-fg">Pronto para enviar?</h2>
              <p className="mt-1 text-fg-2">Crie sua conta e faça o primeiro pedido em poucos minutos.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/login" className={buttonClass('outline', 'lg')}>Entrar</Link>
              <Link href="/registro" className={buttonClass('brand', 'lg')}>Criar conta</Link>
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
