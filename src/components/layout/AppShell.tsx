'use client'

import { useSession } from 'next-auth/react'
import Header from '@/components/ui/Header'
import { TransicaoTela } from '@/components/layout/Transicao'

/** Moldura do app do motoboy e do portal do cliente: o cabeçalho fica, a tela troca. */
export default function AppShell({ papel, children }: { papel: 'MOTOBOY' | 'CLIENTE'; children: React.ReactNode }) {
  const { data: session } = useSession()
  return (
    <div className="min-h-screen bg-page">
      <Header userName={session?.user?.name} userRole={papel} />
      <TransicaoTela>{children}</TransicaoTela>
    </div>
  )
}
