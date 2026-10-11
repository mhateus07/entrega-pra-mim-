'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Alert, PageHeader } from '@/components/ui/Feedback'
import { TableCard, Table, THead, TBody, TH, TD } from '@/components/ui/Table'
import { LIMITES_PLANO } from '@/lib/planos'

type Plano = keyof typeof LIMITES_PLANO
type Status = 'PENDENTE' | 'ATIVA' | 'SUSPENSA'
interface Central {
  id: string; nome: string; slug: string; plano: Plano; status: Status; createdAt: string
  dono: { nome: string; email: string; telefone: string | null } | null
  usoMes: { entregas: number; chamadasMaps: number }
  _count: { motoboys: number; clientes: number }
}

const STATUS = { PENDENTE: 'warning', ATIVA: 'success', SUSPENSA: 'danger' } as const

// Equipe da plataforma: ativar centrais novas, suspender e mudar plano
export default function PlataformaPage() {
  const { data: session } = useSession()
  const [centrais, setCentrais] = useState<Central[]>([])

  const carregar = useCallback(() => {
    fetch('/api/plataforma/organizacoes').then((r) => r.json()).then((b) => { if (b.success) setCentrais(b.data) }).catch(() => {})
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const alterar = async (id: string, dados: { status?: Status; plano?: Plano }) => {
    const body = await (await fetch(`/api/plataforma/organizacoes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })).json()
    if (body.success) { toast.success('Central atualizada'); carregar() } else toast.error(body.error)
  }

  if (session && !session.user.superadmin) return <Alert variant="danger">Acesso restrito à equipe da plataforma.</Alert>

  return (
    <>
      <PageHeader title="Centrais" description="Todas as centrais da plataforma. A mudança de status vale para os usuários em até 5 minutos." />
      <TableCard>
        <Table className="min-w-[900px]">
          <THead><tr><TH>Central</TH><TH>Dono</TH><TH>Plano</TH><TH className="text-right">Entregas no mês</TH><TH className="text-right">Motoboys</TH><TH>Status</TH><TH /></tr></THead>
          <TBody>
            {centrais.map((c) => (
              <tr key={c.id}>
                <TD><p className="font-medium text-fg">{c.nome}</p><p className="font-mono text-xs text-fg-3">{c.slug}</p></TD>
                <TD><p className="text-fg-2">{c.dono?.nome ?? '—'}</p><p className="text-xs text-fg-3">{c.dono?.email} {c.dono?.telefone}</p></TD>
                <TD>
                  <select value={c.plano} onChange={(e) => alterar(c.id, { plano: e.target.value as Plano })} aria-label={`Plano de ${c.nome}`}
                    className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-fg">
                    {(Object.keys(LIMITES_PLANO) as Plano[]).map((p) => <option key={p} value={p}>{LIMITES_PLANO[p].nome}</option>)}
                  </select>
                </TD>
                <TD className="text-right tabular">{c.usoMes.entregas} / {LIMITES_PLANO[c.plano].entregasMes}</TD>
                <TD className="text-right tabular">{c._count.motoboys}</TD>
                <TD><Badge variant={STATUS[c.status]}>{c.status === 'ATIVA' ? 'Ativa' : c.status === 'PENDENTE' ? 'Pendente' : 'Suspensa'}</Badge></TD>
                <TD className="text-right">
                  {c.status !== 'ATIVA'
                    ? <Button size="sm" onClick={() => alterar(c.id, { status: 'ATIVA' })}>Ativar</Button>
                    : <Button size="sm" variant="ghost" onClick={() => alterar(c.id, { status: 'SUSPENSA' })}>Suspender</Button>}
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>
      </TableCard>
    </>
  )
}
