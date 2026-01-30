'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatarMoeda } from '@/lib/pricing'
import { formatarDataHora } from '@/utils/helpers'

interface Transacao {
  id: string
  tipo: 'CREDITO' | 'DEBITO' | 'SAQUE'
  valor: number
  descricao: string
  status: 'PENDENTE' | 'PROCESSADO' | 'CANCELADO'
  createdAt: string
  pedido: {
    id: string
    tipoServico: string
    valorTotal: number
    entregueEm: string | null
    enderecoOrigem: { bairro: string; cidade: string }
    enderecoDestino: { bairro: string; cidade: string }
  } | null
}

interface Saldo {
  saldoDisponivel: number
  saldoPendente: number
  totalRecebido: number
}

interface Totais {
  creditos: number
  debitos: number
  saques: number
  liquido: number
}

export default function GanhosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [totais, setTotais] = useState<Totais | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'CREDITO' | 'DEBITO' | 'SAQUE'>('todos')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.motoboyId) return

      try {
        // Buscar saldo
        const saldoRes = await fetch(`/api/motoboys/${session.user.motoboyId}/saldo`)
        const saldoData = await saldoRes.json()
        if (saldoData.success) {
          setSaldo(saldoData.data)
        }

        // Buscar transações
        const tipoParam = filtro !== 'todos' ? `&tipo=${filtro}` : ''
        const transRes = await fetch(
          `/api/motoboys/${session.user.motoboyId}/transacoes?limit=100${tipoParam}`
        )
        const transData = await transRes.json()
        if (transData.success) {
          setTransacoes(transData.data.transacoes)
          setTotais(transData.data.totais)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchData()
    }
  }, [status, session, filtro])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'CREDITO':
        return '💰'
      case 'DEBITO':
        return '➖'
      case 'SAQUE':
        return '🏦'
      default:
        return '💵'
    }
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'CREDITO':
        return <Badge variant="success" size="sm">Crédito</Badge>
      case 'DEBITO':
        return <Badge variant="warning" size="sm">Débito</Badge>
      case 'SAQUE':
        return <Badge variant="info" size="sm">Saque</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSADO':
        return <Badge variant="success" size="sm">Processado</Badge>
      case 'PENDENTE':
        return <Badge variant="warning" size="sm">Pendente</Badge>
      case 'CANCELADO':
        return <Badge variant="danger" size="sm">Cancelado</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/motoboy" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Meus Ganhos</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Saldo Card */}
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Disponível</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatarMoeda(saldo?.saldoDisponivel || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Pronto para saque
                </p>
              </div>
              <div className="text-center border-x border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pendente</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {formatarMoeda(saldo?.saldoPendente || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Aguardando liberação
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Recebido</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatarMoeda(saldo?.totalRecebido || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Desde o início
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button className="w-full" disabled={!saldo?.saldoDisponivel || saldo.saldoDisponivel === 0}>
                Solicitar Saque
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Saques são processados em até 24h úteis
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        {totais && (
          <div className="grid grid-cols-4 gap-4">
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Entregas</p>
                <p className="text-lg font-bold text-green-600">
                  +{formatarMoeda(totais.creditos)}
                </p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Débitos</p>
                <p className="text-lg font-bold text-red-600">
                  -{formatarMoeda(totais.debitos)}
                </p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Saques</p>
                <p className="text-lg font-bold text-blue-600">
                  -{formatarMoeda(totais.saques)}
                </p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Líquido</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatarMoeda(totais.liquido)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2">
          {(['todos', 'CREDITO', 'DEBITO', 'SAQUE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'CREDITO' ? 'Créditos' : f === 'DEBITO' ? 'Débitos' : 'Saques'}
            </button>
          ))}
        </div>

        {/* Transações */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {transacoes.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Nenhuma transação encontrada
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {transacoes.map((transacao) => (
                  <div key={transacao.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getTipoIcon(transacao.tipo)}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getTipoBadge(transacao.tipo)}
                          {getStatusBadge(transacao.status)}
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {transacao.descricao}
                        </p>
                        {transacao.pedido && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {transacao.pedido.enderecoOrigem.bairro} → {transacao.pedido.enderecoDestino.bairro}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatarDataHora(transacao.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-lg font-bold ${
                      transacao.tipo === 'CREDITO' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transacao.tipo === 'CREDITO' ? '+' : '-'}
                      {formatarMoeda(transacao.valor)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
