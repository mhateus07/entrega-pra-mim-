'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { formatarMoeda, formatarDistancia, formatarTempo } from '@/lib/pricing'
import { TipoServico } from '@/types'

interface Endereco {
  id: string
  apelido: string | null
  logradouro: string
  numero: string
  bairro: string
  cidade: string
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

interface NovoPedidoFormProps {
  clienteId: string
  enderecos: Endereco[]
  onSubmit: (data: {
    clienteId: string
    enderecoOrigemId: string
    enderecoDestinoId: string
    tipoServico: TipoServico
    descricaoItem?: string
    observacoes?: string
    dataAgendada?: string
  }) => Promise<void>
  isLoading?: boolean
}

const tiposServico = [
  { value: 'AGENDADA', label: 'Entrega Agendada (1.0x)' },
  { value: 'DOCUMENTOS', label: 'Documentos (1.2x)' },
  { value: 'EXPRESSA', label: 'Entrega Expressa (1.5x)' },
]

export default function NovoPedidoForm({
  clienteId,
  enderecos,
  onSubmit,
  isLoading = false,
}: NovoPedidoFormProps) {
  const [enderecoOrigemId, setEnderecoOrigemId] = useState('')
  const [enderecoDestinoId, setEnderecoDestinoId] = useState('')
  const [tipoServico, setTipoServico] = useState<TipoServico>('AGENDADA')
  const [descricaoItem, setDescricaoItem] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [dataAgendada, setDataAgendada] = useState('')

  const [rotaCalculada, setRotaCalculada] = useState<RotaCalculada | null>(null)
  const [calculandoRota, setCalculandoRota] = useState(false)
  const [erroRota, setErroRota] = useState('')

  const enderecosOptions = enderecos.map((e) => ({
    value: e.id,
    label: e.apelido || `${e.logradouro}, ${e.numero} - ${e.bairro}`,
  }))

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
        setErroRota('Enderecos sem coordenadas')
        return
      }

      setCalculandoRota(true)
      setErroRota('')

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
          setErroRota(data.error || 'Erro ao calcular rota')
        }
      } catch (error) {
        setErroRota('Erro ao calcular rota')
      } finally {
        setCalculandoRota(false)
      }
    }

    calcularRota()
  }, [enderecoOrigemId, enderecoDestinoId, tipoServico, enderecos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSubmit({
      clienteId,
      enderecoOrigemId,
      enderecoDestinoId,
      tipoServico,
      descricaoItem: descricaoItem || undefined,
      observacoes: observacoes || undefined,
      dataAgendada: dataAgendada || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Nova Entrega</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Select
            label="Endereço de Origem (Coleta)"
            options={enderecosOptions}
            value={enderecoOrigemId}
            onChange={(e) => setEnderecoOrigemId(e.target.value)}
            placeholder="Selecione o endereço de origem"
            required
          />

          <Select
            label="Endereço de Destino (Entrega)"
            options={enderecosOptions}
            value={enderecoDestinoId}
            onChange={(e) => setEnderecoDestinoId(e.target.value)}
            placeholder="Selecione o endereço de destino"
            required
          />

          <Select
            label="Tipo de Serviço"
            options={tiposServico}
            value={tipoServico}
            onChange={(e) => setTipoServico(e.target.value as TipoServico)}
            required
          />

          {tipoServico === 'AGENDADA' && (
            <Input
              type="datetime-local"
              label="Data e Hora Agendada"
              value={dataAgendada}
              onChange={(e) => setDataAgendada(e.target.value)}
            />
          )}

          <Input
            label="Descrição do Item"
            value={descricaoItem}
            onChange={(e) => setDescricaoItem(e.target.value)}
            placeholder="Ex: Caixa pequena com documentos"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
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
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Calculando rota...</p>
            </div>
          )}

          {erroRota && (
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">{erroRota}</p>
            </div>
          )}

          {rotaCalculada && (
            <div className="p-4 bg-blue-50 rounded-lg space-y-2">
              <h4 className="font-medium text-blue-900">Resumo da Entrega</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Distância:</span>
                  <span className="ml-2 font-medium">
                    {formatarDistancia(rotaCalculada.distanciaKm)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Tempo Estimado:</span>
                  <span className="ml-2 font-medium">
                    {formatarTempo(rotaCalculada.duracaoMinutos)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Valor Base:</span>
                  <span className="ml-2">
                    {formatarMoeda(rotaCalculada.valorBase)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Multiplicador:</span>
                  <span className="ml-2">{rotaCalculada.multiplicador}x</span>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <span className="text-gray-600">Valor Total:</span>
                <span className="ml-2 text-lg font-bold text-blue-700">
                  {formatarMoeda(rotaCalculada.valorTotal)}
                </span>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!rotaCalculada || calculandoRota}
          >
            Solicitar Entrega
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
