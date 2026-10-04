'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { buttonClass } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erro na aplicação:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-fg">Algo deu errado</h1>
        <p className="mt-1.5 text-sm text-fg-2">Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className={buttonClass('primary')}>Tentar novamente</button>
          <Link href="/" className={buttonClass('outline')}>Página inicial</Link>
        </div>
      </div>
    </div>
  )
}
