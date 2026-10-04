'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Check, CheckCircle2, MapPin, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Header from '@/components/ui/Header'
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { Alert, DataRow, FullPageLoader, Spinner } from '@/components/ui/Feedback'
import { formatarMoeda, formatarDistancia, formatarTempo, DESCRICOES_SERVICO, MULTIPLICADORES, PRECO_POR_KM } from '@/lib/pricing'
import { LABELS_TIPO_SERVICO } from '@/utils/helpers'
import { cn } from '@/utils/cn'
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

const tiposServico = (['AGENDADA', 'DOCUMENTOS', 'EXPRESSA'] as const).map((value) => ({
  value,
  nome: LABELS_TIPO_SERVICO[value],
  descricao: DESCRICOES_SERVICO[value],
  preco: formatarMoeda(PRECO_POR_KM * MULTIPLICADORES[value]),
}))

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
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)

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

  if (status === 'loading' || isLoading) return <FullPageLoader />

  const etapaAtual = currentStep === 'form' ? 0 : currentStep === 'success' ? 2 : 1

  const shell = (children: React.ReactNode, voltar?: React.ReactNode) => (
    <div className="min-h-screen bg-page">
      <Header userName={session?.user?.name} userRole="CLIENTE" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {voltar ?? (
          <Link href="/cliente" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
            <ArrowLeft className="h-4 w-4" /> Minhas entregas
          </Link>
        )}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Nova entrega</h1>
          <ol className="flex items-center gap-2 text-[13px]" aria-label="Etapas">
            {['Detalhes', 'Pagamento', 'Confirmação'].map((e, i) => (
              <li key={e} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-5 bg-line-strong" aria-hidden="true" />}
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                    i < etapaAtual ? 'bg-fg text-page' : i === etapaAtual ? 'bg-brand text-white' : 'bg-surface-3 text-fg-3'
                  )}
                  aria-current={i === etapaAtual ? 'step' : undefined}
                >
                  {i < etapaAtual ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={i === etapaAtual ? 'font-medium text-fg' : 'text-fg-3'}>{e}</span>
              </li>
            ))}
          </ol>
        </div>
        {children}
      </main>
    </div>
  )

  if (currentStep === 'success') {
    return shell(
      <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-xs">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-fg">
          {pagamentoData?.metodo === 'DINHEIRO' ? 'Pedido confirmado' : 'Pagamento aprovado'}
        </h2>
        <p className="mt-1.5 text-sm text-fg-2">
          {pagamentoData?.metodo === 'DINHEIRO'
            ? 'Seu pedido foi criado. O pagamento será feito na entrega.'
            : 'Seu pedido está pago. Assim que um entregador aceitar, você poderá acompanhar o trajeto.'}
        </p>
        <div className="mt-6 grid gap-2">
          <Button onClick={() => router.push(`/cliente/pedido/${pedidoCriado?.id}`)} className="w-full">Acompanhar pedido</Button>
          <Button variant="outline" onClick={() => router.push('/cliente')} className="w-full">Voltar ao início</Button>
        </div>
      </div>,
      <span className="mb-4 block h-5" />
    )
  }

  if (currentStep === 'pix' && pagamentoData?.pix && pedidoCriado) {
    return shell(
      <div className="mx-auto max-w-lg">
        <PixPayment
          pagamentoId={pagamentoData.id}
          valorTotal={pedidoCriado.valorTotal}
          qrCode={pagamentoData.pix.qrCode}
          copiaCola={pagamentoData.pix.copiaCola}
          expiraEm={pagamentoData.pix.expiraEm}
          onAprovado={handlePixAprovado}
          onCancelado={handlePaymentCancelled}
        />
      </div>,
      <button type="button" onClick={() => setCurrentStep('payment')} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Escolher outra forma de pagamento
      </button>
    )
  }

  if (currentStep === 'payment' && pedidoCriado) {
    return shell(
      <div className="mx-auto max-w-lg space-y-4">
        {error && <Alert variant="danger" icon={AlertCircle}>{error}</Alert>}
        {confirmarDescarte ? (
          <Alert variant="warning" icon={AlertCircle} title="Descartar este pedido?">
            <p>O pedido criado não será pago e você voltará ao formulário.</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmarDescarte(false)}>Continuar pagamento</Button>
              <Button size="sm" variant="danger" onClick={() => { setConfirmarDescarte(false); setCurrentStep('form'); setPedidoCriado(null) }}>Descartar</Button>
            </div>
          </Alert>
        ) : null}
        <PaymentForm
          pedidoId={pedidoCriado.id}
          valorTotal={pedidoCriado.valorTotal}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setConfirmarDescarte(true)}
        />
      </div>,
      <button type="button" onClick={() => setConfirmarDescarte(true)} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Voltar aos detalhes
      </button>
    )
  }

  const enderecosOptions = enderecos.map((e) => ({
    value: e.id,
    label: e.apelido ? `${e.apelido} — ${e.logradouro}, ${e.numero}` : `${e.logradouro}, ${e.numero} - ${e.bairro}`,
  }))

  const campoEndereco = (tipo: 'origem' | 'destino') => {
    const valor = tipo === 'origem' ? enderecoOrigemId : enderecoDestinoId
    const setValor = tipo === 'origem' ? setEnderecoOrigemId : setEnderecoDestinoId
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor={`end-${tipo}`} className="flex items-center gap-2 text-[13px] font-medium text-fg-2">
            {tipo === 'origem'
              ? <span className="h-2.5 w-2.5 rounded-full border-2 border-fg" aria-hidden="true" />
              : <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />}
            {tipo === 'origem' ? 'Endereço de coleta' : 'Endereço de entrega'}
          </label>
          <button
            type="button"
            onClick={() => { setNovoEnderecoTipo(tipo); setMostrarNovoEndereco(true) }}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-fg-2 hover:text-fg"
          >
            <Plus className="h-3.5 w-3.5" /> Novo endereço
          </button>
        </div>
        {enderecosOptions.length > 0 ? (
          <Select
            id={`end-${tipo}`}
            options={enderecosOptions}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Selecione um endereço salvo"
            required
          />
        ) : (
          <button
            type="button"
            onClick={() => { setNovoEnderecoTipo(tipo); setMostrarNovoEndereco(true) }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-4 text-sm text-fg-2 hover:border-fg-3 hover:text-fg"
          >
            <MapPin className="h-4 w-4" /> Cadastrar endereço
          </button>
        )}
      </div>
    )
  }

  const resumo = (
    <aside className="lg:sticky lg:top-20">
      <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
        <h2 className="text-[15px] font-semibold text-fg">Resumo</h2>
        <div className="mt-4 divide-y divide-line text-sm">
          <DataRow label="Serviço">{tiposServico.find((t) => t.value === tipoServico)?.nome}</DataRow>
          <DataRow label="Distância">{rotaCalculada ? formatarDistancia(rotaCalculada.distanciaKm) : '—'}</DataRow>
          <DataRow label="Tempo estimado">{rotaCalculada ? formatarTempo(rotaCalculada.duracaoMinutos) : '—'}</DataRow>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
          <span className="text-sm text-fg-2">Total</span>
          <span className="text-2xl font-semibold tracking-tight tabular text-fg">
            {calculandoRota ? <Spinner className="h-5 w-5" /> : rotaCalculada ? formatarMoeda(rotaCalculada.valorTotal) : '—'}
          </span>
        </div>
        <Button
          type="submit"
          form="nova-entrega"
          className="mt-5 w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={!rotaCalculada || calculandoRota || !enderecoOrigemId || !enderecoDestinoId}
        >
          Continuar para pagamento
        </Button>
        {!rotaCalculada && !calculandoRota && (
          <p className="mt-3 text-center text-xs text-fg-3">Selecione coleta e entrega para calcular o valor.</p>
        )}
      </div>
    </aside>
  )

  return shell(
    <>
      {error && <Alert variant="danger" icon={AlertCircle} className="mb-4">{error}</Alert>}

      {mostrarNovoEndereco ? (
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Novo endereço de {novoEnderecoTipo === 'origem' ? 'coleta' : 'entrega'}</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Apelido (opcional)"
              value={novoEndereco.apelido}
              onChange={(e) => setNovoEndereco({ ...novoEndereco, apelido: e.target.value })}
              placeholder="Ex.: Loja, Escritório"
            />
            <div className="grid grid-cols-[1fr_96px] gap-4 sm:grid-cols-[160px_1fr_96px]">
              <Input label="CEP" value={novoEndereco.cep} onChange={(e) => setNovoEndereco({ ...novoEndereco, cep: e.target.value })} placeholder="00000-000" inputMode="numeric" required />
              <div className="order-last col-span-2 sm:order-none sm:col-span-1">
                <Input label="Cidade" value={novoEndereco.cidade} onChange={(e) => setNovoEndereco({ ...novoEndereco, cidade: e.target.value })} required />
              </div>
              <Input label="UF" value={novoEndereco.estado} onChange={(e) => setNovoEndereco({ ...novoEndereco, estado: e.target.value.toUpperCase() })} placeholder="MG" maxLength={2} required />
            </div>
            <div className="grid grid-cols-[1fr_96px] gap-4">
              <Input label="Logradouro" value={novoEndereco.logradouro} onChange={(e) => setNovoEndereco({ ...novoEndereco, logradouro: e.target.value })} placeholder="Rua, avenida…" required />
              <Input label="Número" value={novoEndereco.numero} onChange={(e) => setNovoEndereco({ ...novoEndereco, numero: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Bairro" value={novoEndereco.bairro} onChange={(e) => setNovoEndereco({ ...novoEndereco, bairro: e.target.value })} required />
              <Input label="Complemento (opcional)" value={novoEndereco.complemento} onChange={(e) => setNovoEndereco({ ...novoEndereco, complemento: e.target.value })} placeholder="Sala, apto, referência" />
            </div>
          </div>
          <CardFooter className="justify-end">
            <Button variant="outline" onClick={() => setMostrarNovoEndereco(false)}>Cancelar</Button>
            <Button onClick={handleSalvarEndereco} isLoading={salvandoEndereco}>Salvar endereço</Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <form id="nova-entrega" onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Trajeto</CardTitle></CardHeader>
              <div className="space-y-5">
                {campoEndereco('origem')}
                {campoEndereco('destino')}
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tipo de serviço</CardTitle></CardHeader>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de serviço">
                {tiposServico.map((t) => {
                  const ativo = tipoServico === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => setTipoServico(t.value)}
                      className={cn(
                        'rounded-lg border p-3.5 text-left transition-colors',
                        ativo ? 'border-fg ring-1 ring-fg' : 'border-line-strong hover:border-fg-3'
                      )}
                    >
                      <span className="block text-sm font-medium text-fg">{t.nome}</span>
                      <span className="mt-0.5 block text-xs text-fg-3">{t.descricao}</span>
                      <span className="mt-2 block text-[13px] tabular text-fg-2">{t.preco}/km</span>
                    </button>
                  )
                })}
              </div>
              {tipoServico === 'AGENDADA' && (
                <div className="mt-4 sm:max-w-xs">
                  <Input type="datetime-local" label="Data e hora da coleta" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />
                </div>
              )}
            </Card>

            <Card>
              <CardHeader><CardTitle>Detalhes do envio</CardTitle></CardHeader>
              <div className="space-y-4">
                <Input
                  label="O que será entregue? (opcional)"
                  value={descricaoItem}
                  onChange={(e) => setDescricaoItem(e.target.value)}
                  placeholder="Ex.: envelope, caixa pequena, chaves"
                />
                <Textarea
                  label="Instruções para o entregador (opcional)"
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ponto de referência, com quem retirar, horário…"
                />
              </div>
            </Card>
          </form>
          {resumo}
        </div>
      )}
    </>
  )
}
