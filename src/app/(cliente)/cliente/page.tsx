'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight, PackageOpen, Plus } from 'lucide-react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import Pagination from '@/components/ui/Pagination'
import Header from '@/components/ui/Header'
import { buttonClass } from '@/components/ui/Button'
import { EmptyState, FullPageLoader, PageHeader } from '@/components/ui/Feedback'
import { PedidoStatusBadge } from '@/components/ui/StatusBadge'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_TIPO_SERVICO, codigoPedido, formatarData, formatarDataHora } from '@/utils/helpers'
import type { StatusPedido, TipoServico } from '@prisma/client'

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: TipoServico
  valorTotal: number
  distanciaKm: number
  duracaoEstimada: number
  createdAt: string
  enderecoOrigem: { logradouro: string; numero: string; bairro: string }
  enderecoDestino: { logradouro: string; numero: string; bairro: string }
  motoboy?: { user: { nome: string; telefone: string } }
}

const ETAPAS: StatusPedido[] = ['SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA', 'ENTREGUE']

function Progresso({ status }: { status: StatusPedido }) {
  const idx = ETAPAS.indexOf(status)
  return (
    <div className="flex gap-1" aria-hidden="true">
      {ETAPAS.slice(0, 4).map((e, i) => (
        <span key={e} className={`h-1 flex-1 rounded-full ${i <= idx ? 'bg-brand' : 'bg-surface-3'}`} />
      ))}
    </div>
  )
}

export default function ClientePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const ativos = usePaginatedList<Pedido>(status === 'authenticated' ? '/api/pedidos?grupo=ativos' : null, 10000)
  const historico = usePaginatedList<Pedido>(status === 'authenticated' ? '/api/pedidos?grupo=finalizados' : null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') return <FullPageLoader />

  const primeiroNome = session?.user?.name?.split(' ')[0]

  return (
    <div className="min-h-screen bg-page">
      <Header userName={session?.user?.name} userRole="CLIENTE" />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          title={primeiroNome ? `Olá, ${primeiroNome}` : 'Minhas entregas'}
          description="Acompanhe suas entregas em andamento e consulte o histórico."
          actions={
            <Link href="/cliente/nova-entrega" className={buttonClass('brand', 'md', 'w-full sm:w-auto')}>
              <Plus className="h-4 w-4" /> Nova entrega
            </Link>
          }
        />

        {ativos.data.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-medium text-fg-2">Em andamento <span className="text-fg-3">· {ativos.pagination.total}</span></h2>
            <div className="grid gap-3 md:grid-cols-2">
              {ativos.data.map((p) => (
                <Link
                  key={p.id}
                  href={`/cliente/pedido/${p.id}`}
                  className="group rounded-xl border border-line bg-surface p-5 shadow-xs transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <PedidoStatusBadge status={p.status} />
                        <span className="text-xs text-fg-3">{LABELS_TIPO_SERVICO[p.tipoServico]}</span>
                      </div>
                      <p className="mt-2 font-mono text-xs text-fg-3">{codigoPedido(p.id)} · {formatarDataHora(p.createdAt)}</p>
                    </div>
                    <p className="text-lg font-semibold tabular text-fg">{formatarMoeda(p.valorTotal)}</p>
                  </div>
                  <div className="mt-4"><Progresso status={p.status} /></div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs text-fg-3">Coleta</p>
                      <p className="truncate text-fg">{p.enderecoOrigem.logradouro}, {p.enderecoOrigem.numero}</p>
                      <p className="truncate text-[13px] text-fg-3">{p.enderecoOrigem.bairro}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-fg-3">Entrega</p>
                      <p className="truncate text-fg">{p.enderecoDestino.logradouro}, {p.enderecoDestino.numero}</p>
                      <p className="truncate text-[13px] text-fg-3">{p.enderecoDestino.bairro}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[13px]">
                    <span className="text-fg-3">{p.motoboy ? <>Entregador: <span className="text-fg-2">{p.motoboy.user.nome}</span></> : 'Procurando entregador…'}</span>
                    <span className="inline-flex items-center gap-0.5 font-medium text-fg-2 group-hover:text-fg">Acompanhar <ChevronRight className="h-4 w-4" /></span>
                  </div>
                </Link>
              ))}
            </div>
            {ativos.pagination.totalPages > 1 && (
              <Pagination pagination={ativos.pagination} onPageChange={ativos.setPage} loading={ativos.loading} error={ativos.error} />
            )}
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium text-fg-2">Histórico</h2>
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            {historico.data.length === 0 ? (
              historico.loading ? (
                <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
              ) : (
                <EmptyState
                  icon={PackageOpen}
                  title="Nenhuma entrega finalizada"
                  description="Suas entregas concluídas ou canceladas aparecem aqui."
                />
              )
            ) : (
              <ul className="divide-y divide-line">
                {historico.data.map((p) => (
                  <li key={p.id}>
                    <Link href={`/cliente/pedido/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/60">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-fg">{p.enderecoOrigem.bairro} <span className="text-fg-3">→</span> {p.enderecoDestino.bairro}</p>
                        <p className="text-xs text-fg-3">{formatarData(p.createdAt)} · {LABELS_TIPO_SERVICO[p.tipoServico]}</p>
                      </div>
                      <PedidoStatusBadge status={p.status} className="hidden sm:inline-flex" />
                      <span className="w-24 text-right text-sm font-medium tabular text-fg">{formatarMoeda(p.valorTotal)}</span>
                      <ChevronRight className="h-4 w-4 text-fg-3" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Pagination pagination={historico.pagination} onPageChange={historico.setPage} loading={historico.loading} error={historico.error} />
        </section>
      </main>
    </div>
  )
}
