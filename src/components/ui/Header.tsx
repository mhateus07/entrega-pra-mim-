'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'
import ThemeToggle from './ThemeToggle'

interface HeaderProps {
  userName?: string | null
  userRole?: 'ADMIN' | 'CLIENTE' | 'MOTOBOY'
  showBackButton?: boolean
  backHref?: string
}

export default function Header({ userName, userRole, showBackButton, backHref }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  const getNavLinks = () => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/dashboard/pedidos', label: 'Pedidos' },
          { href: '/dashboard/motoboys', label: 'Motoboys' },
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
          { href: '/cliente', label: 'Minhas Entregas' },
          { href: '/cliente/nova-entrega', label: 'Nova Entrega' },
        ]
      default:
        return []
    }
  }

  const navLinks = getNavLinks()

  return (
    <motion.header
      className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50 sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            {showBackButton && backHref && (
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href={backHref} className="mr-2 p-2 -ml-2 hover:bg-cyan-500/10 dark:hover:bg-cyan-400/10 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              </motion.div>
            )}
            <Link href={userRole === 'ADMIN' ? '/dashboard' : userRole === 'MOTOBOY' ? '/motoboy' : '/cliente'} className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 relative flex-shrink-0 rounded-xl overflow-hidden"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
              </motion.div>
              <span className="text-lg sm:text-xl font-bold text-gradient hidden sm:block">
                ENTREGA PRA MIM
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={link.href}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 font-medium text-sm transition-all duration-200"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {userName && (
              <motion.span
                className="text-sm text-slate-500 dark:text-slate-400 max-w-[120px] truncate px-3 py-1.5 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {userName}
              </motion.span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl hover:bg-cyan-500/10 dark:hover:bg-cyan-400/10 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: menuOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {menuOpen ? (
                  <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </motion.div>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="md:hidden py-4 border-t border-white/20 dark:border-slate-800/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {userName && (
                <motion.div
                  className="px-3 py-3 mb-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/20 dark:border-slate-700/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">Logado como</p>
                  <p className="font-semibold text-slate-800 dark:text-white truncate">{userName}</p>
                </motion.div>
              )}
              <nav className="space-y-1">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-cyan-500/10 dark:hover:bg-cyan-400/10 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium transition-all duration-200"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-500/10 font-medium transition-all duration-200"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + navLinks.length * 0.05 }}
                >
                  Sair da conta
                </motion.button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
