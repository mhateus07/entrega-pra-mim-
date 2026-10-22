'use client'

import { useSession } from 'next-auth/react'
import Header from '@/components/ui/Header'
import { TransicaoTela } from '@/components/layout/Transicao'
import ConnectionStatus from './ConnectionStatus'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Moldura do app do motoboy e do portal do cliente: o cabeçalho fica, a tela troca. */
export default function AppShell({ papel, children }: { papel: 'MOTOBOY' | 'CLIENTE'; children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const links = papel === 'MOTOBOY' ? [['/motoboy', 'Corridas'], ['/motoboy/ganhos', 'Ganhos'], ['/motoboy/historico', 'Histórico']] : [['/cliente', 'Entregas'], ['/cliente/nova-entrega', 'Nova entrega']]
  return (
    <div className="min-h-screen bg-page pb-24 md:pb-0">
      <ConnectionStatus />
      <Header userName={session?.user?.name} userRole={papel} />
      <TransicaoTela>{children}</TransicaoTela>
      <nav aria-label="Atalhos do aplicativo" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`flex min-h-12 flex-1 items-center justify-center rounded-xl text-sm font-semibold ${pathname === href ? 'bg-brand-soft text-brand' : 'text-fg-2'}`}>{label}</Link>)}
      </nav>
    </div>
  )
}
