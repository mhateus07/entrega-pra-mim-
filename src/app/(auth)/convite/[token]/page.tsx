'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Alert, FullPageLoader } from '@/components/ui/Feedback'
import CadastroConvite, { type PapelConvite } from '@/components/cadastro/CadastroConvite'

interface Convite { central: string; papel: PapelConvite; email: string | null; nome: string | null }

// Página do link de convite enviado pela central
export default function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [convite, setConvite] = useState<Convite | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/publico/convites/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((body) => (body.success ? setConvite(body.data) : setErro(body.error)))
      .catch(() => setErro('Não foi possível abrir o convite'))
  }, [token])

  if (erro) {
    return (
      <AuthLayout>
        <Alert variant="danger" icon={AlertCircle} title="Convite indisponível">{erro}</Alert>
        <p className="mt-4 text-sm text-fg-3">Já tem conta? <Link href="/login" className="font-medium text-fg underline underline-offset-4">Entrar</Link></p>
      </AuthLayout>
    )
  }
  if (!convite) return <FullPageLoader />
  return <CadastroConvite token={token} papel={convite.papel} central={convite.central} email={convite.email} nome={convite.nome} />
}
