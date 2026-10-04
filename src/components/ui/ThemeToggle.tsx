'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useHydrated } from '@/hooks/useHydrated'
import { cn } from '@/utils/cn'

export default function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useHydrated()
  const dark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg', className)}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
    >
      {mounted ? (dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />) : <span className="h-[18px] w-[18px]" />}
    </button>
  )
}
