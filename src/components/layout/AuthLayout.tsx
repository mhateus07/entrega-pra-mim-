import Link from 'next/link'
import { Camera, MapPin, Receipt } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'

const pontos = [
  { icon: Receipt, title: 'Preço antes de confirmar', text: 'O valor é calculado pela distância e pelo tipo de serviço.' },
  { icon: MapPin, title: 'Acompanhamento ao vivo', text: 'Veja a posição do entregador da coleta até a entrega.' },
  { icon: Camera, title: 'Comprovante de entrega', text: 'Foto registrada no momento da entrega, disponível no pedido.' },
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

      <aside className="relative hidden overflow-hidden border-l border-line bg-[#141413] text-white dark:bg-surface-2 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <svg className="absolute -right-24 top-16 h-[420px] w-[420px] text-white/[0.07]" viewBox="0 0 400 400" fill="none" aria-hidden="true">
          <path d="M40 360 C 120 300, 80 200, 180 170 S 300 120, 360 40" stroke="currentColor" strokeWidth="2" strokeDasharray="6 10" />
          <circle cx="40" cy="360" r="10" fill="currentColor" />
          <circle cx="360" cy="40" r="14" stroke="currentColor" strokeWidth="2" />
        </svg>
        <div className="relative">
          <p className="text-sm font-medium text-[#f0712b]">Entregas urbanas sob demanda</p>
          <h2 className="mt-3 max-w-sm text-[28px] font-semibold leading-tight tracking-tight">
            Do pedido ao comprovante, tudo em um só lugar.
          </h2>
        </div>
        <ul className="relative space-y-6">
          {pontos.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <Icon className="h-4 w-4 text-white/80" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-[13px] text-white/60">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
