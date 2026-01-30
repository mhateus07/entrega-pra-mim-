'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { formatarMoeda, formatarDistancia, formatarTempo } from '@/lib/pricing'
import { LABELS_STATUS_PEDIDO, CORES_STATUS_PEDIDO, formatarDataHora } from '@/utils/helpers'
import { StatusPedido } from '@/types'

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: string
  valorTotal: number
  distanciaKm: number
  duracaoEstimada: number
  descricaoItem: string | null
  observacoes: string | null
  createdAt: string
  aceitoEm: string | null
  coletadoEm: string | null
  entregueEm: string | null
  canceladoEm: string | null
  motivoCancelamento: string | null
  cliente: {
    id: string
    user: {
      nome: string
      email: string
      telefone: string
    }
  }
  motoboy: {
    id: string
    avaliacaoMedia: number
    user: {
      nome: string
      telefone: string
    }
  } | null
  enderecoOrigem: {
    logradouro: string
    numero: string
    complemento: string | null
    bairro: string
    cidade: string
    estado: string
  }
  enderecoDestino: {
    logradouro: string
    numero: string
    complemento: string | null
    bairro: string
    cidade: string
    estado: string
  }
  avaliacao: {
    nota: number
    comentario: string | null
  } | null
}

interface Motoboy {
  id: string
  status: string
  user: {
    nome: string
  }
}

export default function PedidoAdminDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [motoboys, setMotoboys] = useState<Motoboy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedMotoboy, setSelectedMotoboy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pedidoRes, motoboysRes] = await Promise.all([
          fetch(`/api/pedidos/${pedidoId}`),
          fetch('/api/motoboys?status=DISPONIVEL')
        ])

        const pedidoData = await pedidoRes.json()
        const motoboysData = await motoboysRes.json()

        if (pedidoData.success) {
          setPedido(pedidoData.data)
        } else {
          setError('Pedido não encontrado')
        }

        if (motoboysData.success) {
          setMotoboys(motoboysData.data)
        }
      } catch {
        setError('Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated' && pedidoId) {
      fetchData()
    }
  }, [status, pedidoId])

  const handleAtribuirMotoboy = async () => {
    if (!selectedMotoboy) return

    setIsUpdating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motoboyId: selectedMotoboy,
          status: 'ACEITO',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPedido(data.data)
        setSuccess('Motoboy atribuído com sucesso!')
        setSelectedMotoboy('')
      } else {
        setError(data.error || 'Erro ao atribuir motoboy')
      }
    } catch {
      setError('Erro ao atribuir motoboy')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelar = async () => {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return

    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCancelamento: 'Cancelado pelo administrador' }),
      })

      const data = await response.json()

      if (data.success) {
        setPedido({ ...pedido!, status: 'CANCELADO', canceladoEm: new Date().toISOString() })
        setSuccess('Pedido cancelado')
      } else {
        setError(data.error || 'Erro ao cancelar')
      }
    } catch {
      setError('Erro ao cancelar pedido')
    } finally {
      setIsUpdating(false)
    }
  }

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

  if (error && !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/dashboard/pedidos">
            <Button>Voltar</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!pedido) return null

  const podeCancelar = ['SOLICITADO', 'ACEITO'].includes(pedido.status)
  const podeAtribuir = pedido.status === 'SOLICITADO' && !pedido.motoboy

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Entrega Pra Mim</span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="info">{session?.user?.role}</Badge>
              <span className="text-gray-600">{session?.user?.name}</span>
              <Button variant="outline" onClick={handleLogout}>Sair</Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <Link href="/dashboard" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
              Visão Geral
            </Link>
            <Link href="/dashboard/pedidos" className="py-4 px-1 border-b-2 border-blue-600 text-blue-600 font-medium">
              Pedidos
            </Link>
            <Link href="/dashboard/motoboys" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
              Motoboys
            </Link>
            <Link href="/dashboard/clientes" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
              Clientes
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/pedidos" className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedido #{pedido.id.slice(0, 8)}</h1>
            <p className="text-gray-500">{formatarDataHora(pedido.createdAt)}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Status */}
            <Card variant="bordered">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${CORES_STATUS_PEDIDO[pedido.status]}`}>
                      {LABELS_STATUS_PEDIDO[pedido.status]}
                    </span>
                    <Badge variant="info" size="sm" className="ml-2">
                      {pedido.tipoServico}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatarMoeda(pedido.valorTotal)}</p>
                </div>

                {pedido.status === 'CANCELADO' && pedido.motivoCancelamento && (
                  <div className="mt-4 bg-red-50 p-4 rounded-lg">
                    <p className="text-red-700 font-medium">Motivo: {pedido.motivoCancelamento}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Endereços */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Rota</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Coleta</p>
                    <p className="text-gray-900">{pedido.enderecoOrigem.logradouro}, {pedido.enderecoOrigem.numero}</p>
                    {pedido.enderecoOrigem.complemento && <p className="text-gray-600 text-sm">{pedido.enderecoOrigem.complemento}</p>}
                    <p className="text-gray-600 text-sm">{pedido.enderecoOrigem.bairro}, {pedido.enderecoOrigem.cidade} - {pedido.enderecoOrigem.estado}</p>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-gray-300 ml-5 h-4"></div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Entrega</p>
                    <p className="text-gray-900">{pedido.enderecoDestino.logradouro}, {pedido.enderecoDestino.numero}</p>
                    {pedido.enderecoDestino.complemento && <p className="text-gray-600 text-sm">{pedido.enderecoDestino.complemento}</p>}
                    <p className="text-gray-600 text-sm">{pedido.enderecoDestino.bairro}, {pedido.enderecoDestino.cidade} - {pedido.enderecoDestino.estado}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalhes */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Distância</p>
                    <p className="font-medium text-gray-900">{formatarDistancia(pedido.distanciaKm)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tempo Estimado</p>
                    <p className="font-medium text-gray-900">{formatarTempo(pedido.duracaoEstimada)}</p>
                  </div>
                  {pedido.descricaoItem && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Item</p>
                      <p className="font-medium text-gray-900">{pedido.descricaoItem}</p>
                    </div>
                  )}
                  {pedido.observacoes && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Observações</p>
                      <p className="font-medium text-gray-900">{pedido.observacoes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pedido criado</p>
                      <p className="text-xs text-gray-500">{formatarDataHora(pedido.createdAt)}</p>
                    </div>
                  </div>
                  {pedido.aceitoEm && (
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Aceito pelo motoboy</p>
                        <p className="text-xs text-gray-500">{formatarDataHora(pedido.aceitoEm)}</p>
                      </div>
                    </div>
                  )}
                  {pedido.coletadoEm && (
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Coletado</p>
                        <p className="text-xs text-gray-500">{formatarDataHora(pedido.coletadoEm)}</p>
                      </div>
                    </div>
                  )}
                  {pedido.entregueEm && (
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Entregue</p>
                        <p className="text-xs text-gray-500">{formatarDataHora(pedido.entregueEm)}</p>
                      </div>
                    </div>
                  )}
                  {pedido.canceladoEm && (
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Cancelado</p>
                        <p className="text-xs text-gray-500">{formatarDataHora(pedido.canceladoEm)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Avaliação */}
            {pedido.avaliacao && (
              <Card variant="bordered">
                <CardHeader>
                  <CardTitle>Avaliação do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`text-2xl ${star <= pedido.avaliacao!.nota ? 'text-yellow-500' : 'text-gray-300'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  {pedido.avaliacao.comentario && (
                    <p className="text-gray-600">{pedido.avaliacao.comentario}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cliente */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-gray-900">{pedido.cliente.user.nome}</p>
                <p className="text-sm text-gray-600">{pedido.cliente.user.email}</p>
                <p className="text-sm text-gray-600">{pedido.cliente.user.telefone}</p>
              </CardContent>
            </Card>

            {/* Motoboy */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Motoboy</CardTitle>
              </CardHeader>
              <CardContent>
                {pedido.motoboy ? (
                  <div>
                    <p className="font-medium text-gray-900">{pedido.motoboy.user.nome}</p>
                    <p className="text-sm text-gray-600">{pedido.motoboy.user.telefone}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-medium">{pedido.motoboy.avaliacaoMedia.toFixed(1)}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500 mb-4">Nenhum motoboy atribuído</p>
                    {podeAtribuir && motoboys.length > 0 && (
                      <div className="space-y-3">
                        <Select
                          label="Selecionar motoboy"
                          options={motoboys.map(m => ({ value: m.id, label: m.user.nome }))}
                          value={selectedMotoboy}
                          onChange={(e) => setSelectedMotoboy(e.target.value)}
                          placeholder="Escolha um motoboy"
                        />
                        <Button
                          className="w-full"
                          onClick={handleAtribuirMotoboy}
                          isLoading={isUpdating}
                          disabled={!selectedMotoboy}
                        >
                          Atribuir Motoboy
                        </Button>
                      </div>
                    )}
                    {podeAtribuir && motoboys.length === 0 && (
                      <p className="text-sm text-orange-600">Nenhum motoboy disponível</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações */}
            {podeCancelar && (
              <Card variant="bordered">
                <CardHeader>
                  <CardTitle>Ações</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={handleCancelar}
                    isLoading={isUpdating}
                  >
                    Cancelar Pedido
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
