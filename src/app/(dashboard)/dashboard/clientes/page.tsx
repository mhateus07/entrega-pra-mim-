'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Search, Users } from 'lucide-react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import Pagination from '@/components/ui/Pagination'
import Input from '@/components/ui/Input'
import { PageHeader, EmptyState } from '@/components/ui/Feedback'
import { TableCard, Table, THead, TBody, TH, TD } from '@/components/ui/Table'
import { formatarMoeda } from '@/lib/pricing'
import { formatarData } from '@/utils/helpers'

interface Cliente {
  totalGasto: number
  id: string
  cpfCnpj: string | null
  user: { id: string; nome: string; email: string; telefone: string; createdAt: string }
  _count?: { pedidos: number }
  pedidos?: { valorTotal: number; status: string }[]
}

export default function ClientesAdminPage() {
  const { status } = useSession()
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setTermo(busca.trim()), 300)
    return () => clearTimeout(t)
  }, [busca])

  const list = usePaginatedList<Cliente>(status === 'authenticated' ? `/api/clientes?q=${encodeURIComponent(termo)}` : null)
  const clientes = list.data

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  return (
    <>
      <PageHeader
        title="Clientes"
        description={list.loading ? 'Carregando…' : `${list.pagination.total} ${list.pagination.total === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}`}
      />

      <div className="mb-4 w-full sm:max-w-sm">
        <Input
          aria-label="Buscar clientes"
          placeholder="Buscar por nome, e-mail ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          leading={<Search className="h-4 w-4" />}
          className="h-9"
        />
      </div>

      <TableCard>
        {clientes.length === 0 ? (
          list.loading ? (
            <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
          ) : (
            <EmptyState icon={Users} title="Nenhum cliente encontrado" description={termo ? `Nenhum resultado para "${termo}".` : 'Os clientes aparecem aqui após o cadastro.'} />
          )
        ) : (
          <Table className="min-w-[720px]">
            <THead>
              <tr>
                <TH>Cliente</TH>
                <TH>Contato</TH>
                <TH>CPF/CNPJ</TH>
                <TH className="text-right">Pedidos</TH>
                <TH className="text-right">Total pago</TH>
                <TH className="text-right">Cliente desde</TH>
              </tr>
            </THead>
            <TBody>
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2/60">
                  <TD className="font-medium text-fg">{c.user.nome}</TD>
                  <TD>
                    <p className="text-fg-2">{c.user.email}</p>
                    {c.user.telefone && <a href={`tel:${c.user.telefone}`} className="text-xs text-fg-3 hover:text-fg">{c.user.telefone}</a>}
                  </TD>
                  <TD className="font-mono text-[13px] text-fg-3">{c.cpfCnpj || '—'}</TD>
                  <TD className="text-right tabular text-fg-2">{c._count?.pedidos || c.pedidos?.length || 0}</TD>
                  <TD className="text-right font-medium tabular text-fg">{formatarMoeda(c.totalGasto)}</TD>
                  <TD className="text-right tabular text-fg-3">{formatarData(c.user.createdAt)}</TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableCard>
      <Pagination pagination={list.pagination} onPageChange={list.setPage} loading={list.loading} error={list.error} />
    </>
  )
}
