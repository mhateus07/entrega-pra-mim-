'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_STATUS_PEDIDO, CORES_STATUS_PEDIDO } from '@/utils/helpers'
import { StatusPedido } from '@/types'

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: string
  valorTotal: number
  distanciaKm: number
  duracaoEstimada: number
  createdAt: string
  enderecoOrigem: {
    logradouro: string
    numero: string
    bairro: string
  }
  enderecoDestino: {
    logradouro: string
    numero: string
    bairro: string
  }
  motoboy?: {
    user: {
      nome: string
      telefone: string
    }
  }
}

export default function ClientePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchPedidos = async () => {
      if (!session?.user?.clienteId) return

      try {
        const response = await fetch(
          `/api/pedidos?clienteId=${session.user.clienteId}`
        )
        const data = await response.json()

        if (data.success) {
          setPedidos(data.data)
        }
      } catch (error) {
        console.error('Erro ao carregar pedidos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchPedidos()
    }
  }, [status, session])

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const pedidosAtivos = pedidos.filter(
    (p) => !['ENTREGUE', 'CANCELADO'].includes(p.status)
  )
  const pedidosConcluidos = pedidos.filter((p) =>
    ['ENTREGUE', 'CANCELADO'].includes(p.status)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Entrega Pra Mim
              </span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="text-gray-600">{session?.user?.name}</span>
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Minhas Entregas</h1>
          <Link href="/cliente/nova-entrega">
            <Button>Nova Entrega</Button>
          </Link>
        </div>

        {/* Active Orders */}
        {pedidosAtivos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Entregas em Andamento
            </h2>
            <div className="grid gap-4">
              {pedidosAtivos.map((pedido) => (
                <Link key={pedido.id} href={`/cliente/pedido/${pedido.id}`}>
                  <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                CORES_STATUS_PEDIDO[pedido.status]
                              }`}
                            >
                              {LABELS_STATUS_PEDIDO[pedido.status]}
                            </span>
                            <Badge variant="info" size="sm">
                              {pedido.tipoServico}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(pedido.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {formatarMoeda(pedido.valorTotal)}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">
                            Origem
                          </p>
                          <p className="text-sm text-gray-900">
                            {pedido.enderecoOrigem.logradouro},{' '}
                            {pedido.enderecoOrigem.numero}
                          </p>
                          <p className="text-sm text-gray-600">
                            {pedido.enderecoOrigem.bairro}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">
                            Destino
                          </p>
                          <p className="text-sm text-gray-900">
                            {pedido.enderecoDestino.logradouro},{' '}
                            {pedido.enderecoDestino.numero}
                          </p>
                          <p className="text-sm text-gray-600">
                            {pedido.enderecoDestino.bairro}
                          </p>
                        </div>
                      </div>

                      {pedido.motoboy && (
                        <div className="pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500 uppercase mb-1">
                            Motoboy
                          </p>
                          <p className="text-sm text-gray-900">
                            {pedido.motoboy.user.nome}
                          </p>
                          <p className="text-sm text-gray-600">
                            {pedido.motoboy.user.telefone}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Orders */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Historico de Entregas
          </h2>
          {pedidosConcluidos.length === 0 ? (
            <Card variant="bordered">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">
                  Nenhuma entrega concluída ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pedidosConcluidos.map((pedido) => (
                <Link key={pedido.id} href={`/cliente/pedido/${pedido.id}`}>
                  <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              CORES_STATUS_PEDIDO[pedido.status]
                            }`}
                          >
                            {LABELS_STATUS_PEDIDO[pedido.status]}
                          </span>
                          <div>
                            <p className="text-sm text-gray-900">
                              {pedido.enderecoDestino.bairro}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(pedido.createdAt).toLocaleDateString(
                                'pt-BR'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-gray-900">
                            {formatarMoeda(pedido.valorTotal)}
                          </p>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
