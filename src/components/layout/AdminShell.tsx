'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LayoutDashboard, Package, Bike, Users, LogOut, Menu, X } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { cn } from '@/utils/cn'

const nav = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: Package },
  { href: '/dashboard/motoboys', label: 'Entregadores', icon: Bike },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
]

function initials(name?: string | null) {
  if (!name) return '·'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navegação principal">
      {nav.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
              active ? 'bg-surface text-fg shadow-xs ring-1 ring-line' : 'text-fg-2 hover:bg-surface-3/60 hover:text-fg'
            )}
          >
            <Icon className={cn('h-4 w-4', active ? 'text-brand' : 'text-fg-3')} aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function UserBlock() {
  const { data: session } = useSession()
  return (
    <div className="flex items-center gap-2.5 rounded-lg p-1.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-fg">
        {initials(session?.user?.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-fg">{session?.user?.name ?? '—'}</p>
        <p className="truncate text-xs text-fg-3">Administrador</p>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-3 hover:bg-surface-3/60 hover:text-fg"
        aria-label="Sair da conta"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-page lg:pl-60">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface-2 px-3 py-4 lg:flex">
        <Link href="/dashboard" className="mb-6 px-2">
          <Logo markClassName="h-7 w-7" />
        </Link>
        <p className="mb-2 px-2.5 text-[11px] font-medium uppercase tracking-wider text-fg-3">Operação</p>
        <NavList />
        <div className="mt-auto space-y-2 border-t border-line pt-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-fg-3">Tema</span>
            <ThemeToggle className="h-8 w-8" />
          </div>
          <UserBlock />
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard"><Logo markClassName="h-7 w-7" /></Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-2 hover:bg-surface-2"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col border-l border-line bg-surface-2 px-3 py-4 shadow-pop">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo markClassName="h-7 w-7" />
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-2 hover:bg-surface-3" aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-line pt-3">
              <UserBlock />
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  )
}
