import Link from 'next/link'
import Logo from '@/components/brand/Logo'
import { buttonClass } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-page px-4 py-6 sm:px-8">
      <Link href="/" aria-label="Página inicial"><Logo /></Link>
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-sm text-center">
          <p className="font-mono text-sm text-brand">404</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Página não encontrada</h1>
          <p className="mt-2 text-sm text-fg-2">O endereço pode ter mudado ou não existe mais.</p>
          <Link href="/" className={buttonClass('primary', 'md', 'mt-6')}>Voltar ao início</Link>
        </div>
      </div>
    </div>
  )
}
