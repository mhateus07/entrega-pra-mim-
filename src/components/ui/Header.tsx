'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { ArrowLeft, LogOut, Menu, X } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import ThemeToggle from './ThemeToggle'
import { cn } from '@/utils/cn'

interface HeaderProps {
  userName?: string | null
  userRole?: 'ADMIN' | 'CLIENTE' | 'MOTOBOY'
  showBackButton?: boolean
  backHref?: string
}

function linksFor(role?: HeaderProps['userRole']) {
  switch (role) {
    case 'ADMIN':
      return [
        { href: '/dashboard', label: 'Visão geral' },
        { href: '/dashboard/pedidos', label: 'Pedidos' },
        { href: '/dashboard/motoboys', label: 'Entregadores' },
        { href: '/dashboard/clientes', label: 'Clientes' },
      ]
    case 'MOTOBOY':
      return [
        { href: '/motoboy', label: 'Início' },
        { href: '/motoboy/ganhos', label: 'Ganhos' },
        { href: '/motoboy/historico', label: 'Histórico' },
      ]
    case 'CLIENTE':
      return [
        { href: '/cliente', label: 'Minhas entregas' },
        { href: '/cliente/nova-entrega', label: 'Nova entrega' },
      ]
    default:
      return []
  }
}

export default function Header({ userName, userRole, showBackButton, backHref }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const navLinks = linksFor(userRole)
  const home = userRole === 'ADMIN' ? '/dashboard' : userRole === 'MOTOBOY' ? '/motoboy' : '/cliente'
  const isActive = (href: string) => (href === home ? pathname === href : pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {showBackButton && backHref && (
            <Link href={backHref} className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-2 hover:bg-surface-2" aria-label="Voltar">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Link>
          )}
          <Link href={home} className="flex items-center">
            <Logo markClassName="h-7 w-7" className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
          </Link>
          {navLinks.length > 0 && <span className="mx-3 hidden h-5 w-px bg-line md:block" aria-hidden="true" />}
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Navegação principal">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive(link.href) ? 'bg-surface-2 text-fg' : 'text-fg-3 hover:text-fg'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <ThemeToggle />
          {userName && <span className="ml-2 max-w-[160px] truncate text-sm text-fg-2">{userName}</span>}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-fg-3 hover:bg-surface-2 hover:text-fg"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-2 hover:bg-surface-2"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-surface px-4 pb-4 pt-2 md:hidden">
          {userName && <p className="px-3 py-2 text-[13px] text-fg-3">Conectado como <span className="font-medium text-fg">{userName}</span></p>}
          <nav className="flex flex-col gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn('rounded-lg px-3 py-2.5 text-sm font-medium', isActive(link.href) ? 'bg-surface-2 text-fg' : 'text-fg-2')}
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
