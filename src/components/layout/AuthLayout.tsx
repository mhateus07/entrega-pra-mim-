import Link from 'next/link'
import { Calculator, MapPin, Radio } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import Faixa from '@/components/brand/Faixa'
import Rota from '@/components/brand/Rota'

const pontos = [
  { icon: Radio, title: 'Despacho com oferta', text: 'A corrida vai para o motoboy mais perto e passa ao próximo se ele não aceitar.' },
  { icon: MapPin, title: 'Rastreio com a sua marca', text: 'O cliente final acompanha por link, sem baixar nada.' },
  { icon: Calculator, title: 'Fechamento em minutos', text: 'Quanto pagar a cada motoboy e quanto cobrar de cada empresa.' },
]

export default function AuthLayout({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-[1fr_minmax(420px,520px)]">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Página inicial"><Logo /></Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className={wide ? 'w-full max-w-xl' : 'w-full max-w-sm'}>{children}</div>
        </div>
        <p className="text-center text-xs text-fg-3">© {new Date().getFullYear()} Entrega Pra Mim</p>
      </div>

      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#141413] text-white lg:flex">
        <div className="relative px-12 pt-12">
          <p className="rotulo text-white/60">Sistema para centrais de motofrete</p>
          <p className="titulo-display mt-4 text-[52px]">
            Despacha.<br />Rastreia.<br /><span className="text-[#f0712b]">Fecha o dia.</span>
          </p>
        </div>

        {/* A rota da marca atravessa o painel: coleta embaixo, entrega no alto */}
        <Rota
          className="mx-12 my-6 h-40 text-white"
          viewBox="0 0 400 160"
          d="M24 136 H150 L214 72 H330"
          inicio={{ x: 24, y: 136 }}
          fim={{ x: 370, y: 40 }}
          trecho="M330 72 L370 40"
          cor="#ffffff"
          fundo="#141413"
          espessura={7}
          duracao={1.6}
          atraso={0.3}
        />

        <ul className="relative space-y-5 px-12 pb-10">
          {pontos.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/5">
                <Icon className="h-4 w-4 text-[#f0712b]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-[13px] text-white/60">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <Faixa className="h-[22px]" reflexo="sempre" />
      </aside>
    </div>
  )
}
