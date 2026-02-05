'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface NavLink {
  href: string
  label: string
}

interface DashboardHeaderProps {
  activeTab: 'visao-geral' | 'pedidos' | 'motoboys' | 'clientes'
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Visão Geral' },
  { href: '/dashboard/pedidos', label: 'Pedidos' },
  { href: '/dashboard/motoboys', label: 'Motoboys' },
  { href: '/dashboard/clientes', label: 'Clientes' },
]

export default function DashboardHeader({ activeTab }: DashboardHeaderProps) {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  const isActive = (href: string) => {
    if (activeTab === 'visao-geral' && href === '/dashboard') return true
    if (activeTab === 'pedidos' && href === '/dashboard/pedidos') return true
    if (activeTab === 'motoboys' && href === '/dashboard/motoboys') return true
    if (activeTab === 'clientes' && href === '/dashboard/clientes') return true
    return false
  }

  return (
    <>
      {/* Header */}
      <motion.header
        className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-cyan-500/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
              <motion.div
                className="w-8 h-8 sm:w-10 sm:h-10 relative rounded-xl overflow-hidden ring-2 ring-cyan-500/30 group-hover:ring-cyan-400/60 transition-all flex-shrink-0"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
              </motion.div>
              <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent hidden xs:block">
                Entrega Pra Mim
              </span>
            </Link>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-3 sm:gap-4">
              <Badge variant="info" className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs sm:text-sm">
                {session?.user?.role}
              </Badge>
              <span className="text-slate-400 text-sm hidden md:block max-w-[150px] truncate">{session?.user?.name}</span>
              <Button
                variant="outline"
                onClick={handleLogout}
                size="sm"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
              >
                Sair
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:hidden">
              <Badge variant="info" className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
                {session?.user?.role}
              </Badge>
              <motion.button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-xl hover:bg-cyan-500/10 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: menuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {menuOpen ? (
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </motion.div>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="sm:hidden border-t border-cyan-500/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 py-4 space-y-1">
                {session?.user?.name && (
                  <div className="px-3 py-2 mb-2 bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-500">Logado como</p>
                    <p className="font-medium text-white truncate">{session.user.name}</p>
                  </div>
                )}
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`block px-3 py-3 rounded-lg font-medium transition-all ${
                        isActive(link.href)
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 font-medium transition-all"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.05 }}
                >
                  Sair da conta
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Navigation - Desktop only */}
      <nav className="hidden sm:block sticky top-[57px] sm:top-[65px] z-40 bg-slate-900/60 backdrop-blur-xl border-b border-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${
                  isActive(link.href)
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}
