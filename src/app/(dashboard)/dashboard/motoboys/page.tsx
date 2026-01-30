'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_STATUS_MOTOBOY, CORES_STATUS_MOTOBOY } from '@/utils/helpers'
import { StatusMotoboy } from '@/types'

interface Motoboy {
  id: string
  status: StatusMotoboy
  avaliacaoMedia: number
  totalEntregas: number
  cnh: string
  veiculoModelo: string
  veiculoPlaca: string
  user: {
    nome: string
    email: string
    telefone: string
  }
  _count?: {
    pedidos: number
  }
}

export default function MotoboysAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [motoboys, setMotoboys] = useState<Motoboy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<StatusMotoboy | 'TODOS'>('TODOS')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchMotoboys = async () => {
      try {
        const response = await fetch('/api/motoboys')
        const data = await response.json()

        if (data.success) {
          setMotoboys(data.data)
        }
      } catch (error) {
        console.error('Erro ao carregar motoboys:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchMotoboys()
    }
  }, [status])

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

  const motoboysFiltrados = filtroStatus === 'TODOS'
    ? motoboys
    : motoboys.filter(m => m.status === filtroStatus)

  const statusOptions: (StatusMotoboy | 'TODOS')[] = ['TODOS', 'DISPONIVEL', 'EM_ENTREGA', 'OFFLINE']

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
            <Link href="/dashboard/pedidos" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
              Pedidos
            </Link>
            <Link href="/dashboard/motoboys" className="py-4 px-1 border-b-2 border-blue-600 text-blue-600 font-medium">
              Motoboys
            </Link>
            <Link href="/dashboard/clientes" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
              Clientes
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Motoboys</h1>
          <p className="text-gray-600">{motoboysFiltrados.length} motoboys encontrados</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{motoboys.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{motoboys.filter(m => m.status === 'DISPONIVEL').length}</p>
              <p className="text-sm text-gray-500">Disponíveis</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{motoboys.filter(m => m.status === 'EM_ENTREGA').length}</p>
              <p className="text-sm text-gray-500">Em Entrega</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-400">{motoboys.filter(m => m.status === 'OFFLINE').length}</p>
              <p className="text-sm text-gray-500">Offline</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusOptions.map((statusOption) => (
            <button
              key={statusOption}
              onClick={() => setFiltroStatus(statusOption)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroStatus === statusOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {statusOption === 'TODOS' ? 'Todos' : LABELS_STATUS_MOTOBOY[statusOption]}
            </button>
          ))}
        </div>

        {/* Lista */}
        {motoboysFiltrados.length === 0 ? (
          <Card variant="bordered">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Nenhum motoboy encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {motoboysFiltrados.map((motoboy) => (
              <Card key={motoboy.id} variant="bordered" className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-semibold text-gray-900">{motoboy.user.nome}</p>
                      <p className="text-sm text-gray-600">{motoboy.user.email}</p>
                      <p className="text-sm text-gray-600">{motoboy.user.telefone}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${CORES_STATUS_MOTOBOY[motoboy.status]}`}>
                      {LABELS_STATUS_MOTOBOY[motoboy.status]}
                    </span>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Avaliação</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          {motoboy.avaliacaoMedia.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Entregas</p>
                        <p className="font-medium text-gray-900">{motoboy.totalEntregas}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Veículo</p>
                        <p className="font-medium text-gray-900 text-xs">{motoboy.veiculoModelo}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Placa</p>
                        <p className="font-medium text-gray-900">{motoboy.veiculoPlaca}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
