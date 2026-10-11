'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { paginaInicial } from '@/utils/area'

interface Org { id: string; nome: string; papel: string | null; status: string }

const PAPEL: Record<string, string> = { OWNER: 'Dono', DISPATCHER: 'Despachante', CLIENT: 'Cliente', DRIVER: 'Entregador' }

// Mostra a central ativa e, quando o usuário tem mais de uma, permite trocar.
export default function OrgSwitcher({ className }: { className?: string }) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [trocando, setTrocando] = useState(false)
  const ativa = session?.user?.activeOrganizationId

  useEffect(() => {
    if (!session?.user?.id) return
    const controller = new AbortController()
    fetch('/api/organizacoes', { signal: controller.signal })
      .then((r) => r.json())
      .then((body) => { if (body.success) setOrgs(body.data) })
      .catch(() => {})
    return () => controller.abort()
  }, [session?.user?.id])

  const atual = orgs.find((o) => o.id === ativa)
  const papel = session?.user?.superadmin && !atual?.papel ? 'Superadmin' : PAPEL[session?.user?.orgRole ?? ''] ?? ''

  const trocar = async (id: string) => {
    if (id === ativa) return
    setTrocando(true)
    try {
      const nova = await update({ activeOrganizationId: id })
      router.push(paginaInicial(nova?.user?.orgRole, nova?.user?.superadmin))
      router.refresh()
    } catch {
      toast.error('Não foi possível trocar de central')
    } finally {
      setTrocando(false)
    }
  }

  if (!atual && orgs.length === 0) return null

  return (
    <div className={cn('flex min-w-0 items-center gap-1.5 text-xs text-fg-3', className)}>
      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {orgs.length > 1 ? (
        <select
          value={ativa ?? ''}
          onChange={(e) => trocar(e.target.value)}
          disabled={trocando}
          aria-label="Central ativa"
          className="min-w-0 max-w-[180px] truncate rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-fg"
        >
          {!ativa && <option value="">Selecione a central</option>}
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.nome}{o.status !== 'ATIVA' ? ' (inativa)' : ''}</option>)}
        </select>
      ) : (
        <span className="truncate">{atual?.nome}</span>
      )}
      {papel && <span className="shrink-0 text-fg-3">· {papel}</span>}
    </div>
  )
}
