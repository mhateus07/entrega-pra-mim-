import Link from 'next/link'
import Logo from '@/components/brand/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { TransicaoTela } from '@/components/layout/Transicao'

const pontos = [
  { title: 'Despacho com oferta', text: 'A corrida vai para o motoboy mais perto e passa ao próximo se ele não aceitar.' },
  { title: 'Rastreio com a sua marca', text: 'O cliente final acompanha por link, sem baixar nada.' },
  { title: 'Fechamento em minutos', text: 'Quanto pagar a cada motoboy e quanto cobrar de cada empresa.' },
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
          <TransicaoTela className={wide ? 'w-full max-w-xl' : 'w-full max-w-sm'}>{children}</TransicaoTela>
        </div>
        <p className="text-center text-xs text-fg-3">© {new Date().getFullYear()} Entrega Pra Mim</p>
      </div>

      <aside className="hidden flex-col justify-between bg-[#121314] px-12 py-12 text-white lg:flex">
        <div>
          <p className="text-[13px] text-white/55">Sistema para centrais de motofrete</p>
          <p className="titulo-display mt-4 max-w-[400px] text-[40px]">Cada corrida da sua central, do aceite à foto.</p>
        </div>
        <dl className="divide-y divide-white/10 border-y border-white/10">
          {pontos.map(({ title, text }) => (
            <div key={title} className="grid grid-cols-[150px_1fr] gap-4 py-4">
              <dt className="text-sm font-medium">{title}</dt>
              <dd className="text-[13.5px] leading-relaxed text-white/60">{text}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  )
}
