'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { formatarMoeda, formatarDistancia, formatarTempo } from '@/lib/pricing'
import { TipoServico } from '@/types'
import PaymentForm from '@/components/payment/PaymentForm'
import PixPayment from '@/components/payment/PixPayment'

interface Endereco {
  id: string
  apelido: string | null
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  latitude: number | null
  longitude: number | null
}

interface RotaCalculada {
  distanciaKm: number
  duracaoMinutos: number
  valorBase: number
  multiplicador: number
  valorTotal: number
}

interface PagamentoResult {
  id: string
  status: string
  metodo: string
  pix?: {
    qrCode: string
    copiaCola: string
    expiraEm: string
  }
}

type Step = 'form' | 'payment' | 'pix' | 'success'

const tiposServico = [
  { value: 'AGENDADA', label: 'Entrega Agendada - 1.0x (R$ 3,00/km)' },
  { value: 'DOCUMENTOS', label: 'Documentos - 1.2x (R$ 3,60/km)' },
  { value: 'EXPRESSA', label: 'Entrega Expressa - 1.5x (R$ 4,50/km)' },
]

export default function NovaEntregaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<Step>('form')
  const [pedidoCriado, setPedidoCriado] = useState<{ id: string; valorTotal: number } | null>(null)
  const [pagamentoData, setPagamentoData] = useState<PagamentoResult | null>(null)

  // Form state
  const [enderecoOrigemId, setEnderecoOrigemId] = useState('')
  const [enderecoDestinoId, setEnderecoDestinoId] = useState('')
  const [tipoServico, setTipoServico] = useState<TipoServico>('AGENDADA')
  const [descricaoItem, setDescricaoItem] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [dataAgendada, setDataAgendada] = useState('')

  // Novo endereço state
  const [mostrarNovoEndereco, setMostrarNovoEndereco] = useState(false)
  const [novoEnderecoTipo, setNovoEnderecoTipo] = useState<'origem' | 'destino'>('origem')
  const [novoEndereco, setNovoEndereco] = useState({
    apelido: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  })
  const [salvandoEndereco, setSalvandoEndereco] = useState(false)

  // Rota calculada
  const [rotaCalculada, setRotaCalculada] = useState<RotaCalculada | null>(null)
  const [calculandoRota, setCalculandoRota] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchEnderecos = async () => {
      if (!session?.user?.clienteId) return

      try {
        const response = await fetch(`/api/enderecos?clienteId=${session.user.clienteId}`)
        const data = await response.json()

        if (data.success) {
          setEnderecos(data.data)
        }
      } catch (error) {
        console.error('Erro ao carregar endereços:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchEnderecos()
    }
  }, [status, session])

  // Calcular rota quando origem, destino ou tipo mudam
  useEffect(() => {
    const calcularRota = async () => {
      if (!enderecoOrigemId || !enderecoDestinoId) {
        setRotaCalculada(null)
        return
      }

      const origem = enderecos.find((e) => e.id === enderecoOrigemId)
      const destino = enderecos.find((e) => e.id === enderecoDestinoId)

      if (!origem?.latitude || !origem?.longitude || !destino?.latitude || !destino?.longitude) {
        setError('Endereços sem coordenadas. Tente cadastrar novamente.')
        return
      }

      setCalculandoRota(true)
      setError('')

      try {
        const response = await fetch('/api/rotas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origemLatitude: origem.latitude,
            origemLongitude: origem.longitude,
            destinoLatitude: destino.latitude,
            destinoLongitude: destino.longitude,
            tipoServico,
          }),
        })

        const data = await response.json()

        if (data.success) {
          setRotaCalculada(data.data)
        } else {
          setError(data.error || 'Erro ao calcular rota')
        }
      } catch {
        setError('Erro ao calcular rota')
      } finally {
        setCalculandoRota(false)
      }
    }

    calcularRota()
  }, [enderecoOrigemId, enderecoDestinoId, tipoServico, enderecos])

  const handleSalvarEndereco = async () => {
    if (!session?.user?.clienteId) return

    setSalvandoEndereco(true)
    setError('')

    try {
      const response = await fetch('/api/enderecos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: session.user.clienteId,
          ...novoEndereco,
          cep: novoEndereco.cep.replace(/\D/g, ''),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setEnderecos([...enderecos, data.data])

        if (novoEnderecoTipo === 'origem') {
          setEnderecoOrigemId(data.data.id)
        } else {
          setEnderecoDestinoId(data.data.id)
        }

        setMostrarNovoEndereco(false)
        setNovoEndereco({
          apelido: '',
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
        })
      } else {
        setError(data.error || 'Erro ao salvar endereço')
      }
    } catch {
      setError('Erro ao salvar endereço')
    } finally {
      setSalvandoEndereco(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user?.clienteId) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: session.user.clienteId,
          enderecoOrigemId,
          enderecoDestinoId,
          tipoServico,
          descricaoItem: descricaoItem || undefined,
          observacoes: observacoes || undefined,
          dataAgendada: dataAgendada || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Salvar dados do pedido e ir para pagamento
        setPedidoCriado({
          id: data.data.id,
          valorTotal: data.data.valorTotal,
        })
        setCurrentStep('payment')
      } else {
        setError(data.error || 'Erro ao criar pedido')
      }
    } catch {
      setError('Erro ao criar pedido')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle payment success
  const handlePaymentSuccess = (pagamento: PagamentoResult) => {
    setPagamentoData(pagamento)

    if (pagamento.metodo === 'PIX' && pagamento.pix) {
      // Mostrar tela do PIX
      setCurrentStep('pix')
    } else if (pagamento.status === 'APROVADO' || pagamento.metodo === 'DINHEIRO') {
      // Pagamento aprovado ou dinheiro (será confirmado na entrega)
      setCurrentStep('success')
    }
  }

  // Handle PIX approved
  const handlePixAprovado = () => {
    setCurrentStep('success')
  }

  // Handle payment cancelled
  const handlePaymentCancelled = () => {
    // Voltar ao formulário de pagamento
    setCurrentStep('payment')
    setPagamentoData(null)
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Success step
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {pagamentoData?.metodo === 'DINHEIRO' ? 'Pedido Confirmado!' : 'Pagamento Aprovado!'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {pagamentoData?.metodo === 'DINHEIRO'
              ? 'Seu pedido foi criado. O pagamento será feito na entrega.'
              : 'Seu pedido foi pago com sucesso. Em breve um motoboy aceitará sua entrega.'}
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push(`/cliente/pedido/${pedidoCriado?.id}`)} className="w-full">
              Ver Pedido
            </Button>
            <Button variant="outline" onClick={() => router.push('/cliente')} className="w-full">
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // PIX payment step
  if (currentStep === 'pix' && pagamentoData?.pix && pedidoCriado) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentStep('payment')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pagamento PIX</h1>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PixPayment
            pagamentoId={pagamentoData.id}
            valorTotal={pedidoCriado.valorTotal}
            qrCode={pagamentoData.pix.qrCode}
            copiaCola={pagamentoData.pix.copiaCola}
            expiraEm={pagamentoData.pix.expiraEm}
            onAprovado={handlePixAprovado}
            onCancelado={handlePaymentCancelled}
          />
        </main>
      </div>
    )
  }

  // Payment step
  if (currentStep === 'payment' && pedidoCriado) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (confirm('Voltar vai cancelar este pedido. Deseja continuar?')) {
                    // TODO: Cancelar pedido
                    setCurrentStep('form')
                    setPedidoCriado(null)
                  }
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pagamento</h1>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <PaymentForm
            pedidoId={pedidoCriado.id}
            valorTotal={pedidoCriado.valorTotal}
            onSuccess={handlePaymentSuccess}
            onCancel={() => {
              if (confirm('Cancelar vai descartar este pedido. Deseja continuar?')) {
                setCurrentStep('form')
                setPedidoCriado(null)
              }
            }}
          />
        </main>
      </div>
    )
  }

  const enderecosOptions = enderecos.map((e) => ({
    value: e.id,
    label: e.apelido || `${e.logradouro}, ${e.numero} - ${e.bairro}`,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/cliente" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Nova Entrega</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Formulário de novo endereço */}
        {mostrarNovoEndereco && (
          <Card variant="bordered" className="mb-6">
            <CardHeader>
              <CardTitle>
                Novo Endereço de {novoEnderecoTipo === 'origem' ? 'Coleta' : 'Entrega'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Apelido (opcional)"
                value={novoEndereco.apelido}
                onChange={(e) => setNovoEndereco({ ...novoEndereco, apelido: e.target.value })}
                placeholder="Ex: Casa, Trabalho"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="CEP"
                  value={novoEndereco.cep}
                  onChange={(e) => setNovoEndereco({ ...novoEndereco, cep: e.target.value })}
                  placeholder="00000-000"
                  required
                />
                <Input
                  label="Estado"
                  value={novoEndereco.estado}
                  onChange={(e) => setNovoEndereco({ ...novoEndereco, estado: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                  required
                />
              </div>
              <Input
                label="Cidade"
                value={novoEndereco.cidade}
                onChange={(e) => setNovoEndereco({ ...novoEndereco, cidade: e.target.value })}
                placeholder="São Paulo"
                required
              />
              <Input
                label="Bairro"
                value={novoEndereco.bairro}
                onChange={(e) => setNovoEndereco({ ...novoEndereco, bairro: e.target.value })}
                placeholder="Centro"
                required
              />
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input
                    label="Logradouro"
                    value={novoEndereco.logradouro}
                    onChange={(e) => setNovoEndereco({ ...novoEndereco, logradouro: e.target.value })}
                    placeholder="Rua das Flores"
                    required
                  />
                </div>
                <Input
                  label="Número"
                  value={novoEndereco.numero}
                  onChange={(e) => setNovoEndereco({ ...novoEndereco, numero: e.target.value })}
                  placeholder="123"
                  required
                />
              </div>
              <Input
                label="Complemento (opcional)"
                value={novoEndereco.complemento}
                onChange={(e) => setNovoEndereco({ ...novoEndereco, complemento: e.target.value })}
                placeholder="Apto 101"
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setMostrarNovoEndereco(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEndereco} isLoading={salvandoEndereco}>
                Salvar Endereço
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Formulário principal */}
        {!mostrarNovoEndereco && (
          <form onSubmit={handleSubmit}>
            <Card variant="bordered">
              <CardContent className="p-6 space-y-6">
                {/* Endereço de Origem */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Endereço de Coleta (Origem)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNovoEnderecoTipo('origem')
                        setMostrarNovoEndereco(true)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Novo endereço
                    </button>
                  </div>
                  {enderecosOptions.length > 0 ? (
                    <Select
                      options={enderecosOptions}
                      value={enderecoOrigemId}
                      onChange={(e) => setEnderecoOrigemId(e.target.value)}
                      placeholder="Selecione o endereço de coleta"
                      required
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500 mb-2">Nenhum endereço cadastrado</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNovoEnderecoTipo('origem')
                          setMostrarNovoEndereco(true)
                        }}
                      >
                        Cadastrar endereço
                      </Button>
                    </div>
                  )}
                </div>

                {/* Endereço de Destino */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Endereço de Entrega (Destino)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNovoEnderecoTipo('destino')
                        setMostrarNovoEndereco(true)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Novo endereço
                    </button>
                  </div>
                  {enderecosOptions.length > 0 ? (
                    <Select
                      options={enderecosOptions}
                      value={enderecoDestinoId}
                      onChange={(e) => setEnderecoDestinoId(e.target.value)}
                      placeholder="Selecione o endereço de entrega"
                      required
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500 mb-2">Nenhum endereço cadastrado</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNovoEnderecoTipo('destino')
                          setMostrarNovoEndereco(true)
                        }}
                      >
                        Cadastrar endereço
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tipo de Serviço */}
                <Select
                  label="Tipo de Serviço"
                  options={tiposServico}
                  value={tipoServico}
                  onChange={(e) => setTipoServico(e.target.value as TipoServico)}
                  required
                />

                {/* Data Agendada (para entregas agendadas) */}
                {tipoServico === 'AGENDADA' && (
                  <Input
                    type="datetime-local"
                    label="Data e Hora da Coleta"
                    value={dataAgendada}
                    onChange={(e) => setDataAgendada(e.target.value)}
                  />
                )}

                {/* Descrição do Item */}
                <Input
                  label="O que será entregue? (opcional)"
                  value={descricaoItem}
                  onChange={(e) => setDescricaoItem(e.target.value)}
                  placeholder="Ex: Documentos, Caixa pequena, Envelope"
                />

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (opcional)
                  </label>
                  <textarea
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Instruções especiais para o motoboy..."
                  />
                </div>

                {/* Resumo da Rota */}
                {calculandoRota && (
                  <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-gray-500">Calculando rota...</span>
                  </div>
                )}

                {rotaCalculada && (
                  <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                    <h4 className="font-medium text-blue-900">Resumo da Entrega</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Distância:</span>
                        <span className="ml-2 font-medium">{formatarDistancia(rotaCalculada.distanciaKm)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tempo Estimado:</span>
                        <span className="ml-2 font-medium">{formatarTempo(rotaCalculada.duracaoMinutos)}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-blue-200 flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Valor Total:</span>
                      <span className="text-2xl font-bold text-blue-700">
                        {formatarMoeda(rotaCalculada.valorTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between items-center">
                <Link href="/cliente">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!rotaCalculada || calculandoRota || !enderecoOrigemId || !enderecoDestinoId}
                >
                  Solicitar Entrega - {rotaCalculada ? formatarMoeda(rotaCalculada.valorTotal) : '...'}
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}
      </main>
    </div>
  )
}
