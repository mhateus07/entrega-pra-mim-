'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import {
  formatarValor,
  detectarBandeira,
  LABELS_METODO_PAGAMENTO,
} from '@/lib/pagamentos'

type MetodoPagamento = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO'

interface PaymentFormProps {
  pedidoId: string
  valorTotal: number
  onSuccess: (pagamento: PagamentoResult) => void
  onCancel?: () => void
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

export default function PaymentForm({
  pedidoId,
  valorTotal,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const [metodo, setMetodo] = useState<MetodoPagamento | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Estado do cartão
  const [cartao, setCartao] = useState({
    numero: '',
    nome: '',
    validade: '',
    cvv: '',
  })

  const [bandeira, setBandeira] = useState('')

  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, '')
    // Formatar com espaços
    valor = valor.replace(/(\d{4})(?=\d)/g, '$1 ')
    setCartao({ ...cartao, numero: valor })
    setBandeira(detectarBandeira(valor))
  }

  const handleValidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, '')
    if (valor.length >= 2) {
      valor = valor.slice(0, 2) + '/' + valor.slice(2, 4)
    }
    setCartao({ ...cartao, validade: valor })
  }

  const handlePagar = async () => {
    if (!metodo) {
      toast.error('Selecione uma forma de pagamento')
      return
    }

    setIsLoading(true)

    try {
      const payload: Record<string, unknown> = {
        pedidoId,
        metodo,
      }

      if (metodo === 'CARTAO_CREDITO' || metodo === 'CARTAO_DEBITO') {
        if (!cartao.numero || !cartao.nome || !cartao.validade || !cartao.cvv) {
          toast.error('Preencha todos os dados do cartão')
          setIsLoading(false)
          return
        }
        payload.cartao = {
          numero: cartao.numero.replace(/\s/g, ''),
          nome: cartao.nome,
          validade: cartao.validade,
          cvv: cartao.cvv,
        }
      }

      const response = await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || 'Pagamento processado!')
        onSuccess({
          id: data.data.pagamento.id,
          status: data.data.pagamento.status,
          metodo: data.data.pagamento.metodo,
          pix: data.data.pix,
        })
      } else {
        toast.error(data.error || 'Erro ao processar pagamento')
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      toast.error('Erro ao processar pagamento')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle>Forma de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Valor */}
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Valor a pagar</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatarValor(valorTotal)}
          </p>
        </div>

        {/* Seleção de método */}
        <div className="grid grid-cols-2 gap-3">
          {(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO'] as MetodoPagamento[]).map(
            (m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodo(m)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  metodo === m
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {m === 'PIX' && '📱'}
                    {m === 'CARTAO_CREDITO' && '💳'}
                    {m === 'CARTAO_DEBITO' && '💳'}
                    {m === 'DINHEIRO' && '💵'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {LABELS_METODO_PAGAMENTO[m]}
                    </p>
                    {m === 'PIX' && (
                      <p className="text-xs text-green-600">Aprovação instantânea</p>
                    )}
                  </div>
                </div>
              </button>
            )
          )}
        </div>

        {/* Formulário de cartão */}
        {(metodo === 'CARTAO_CREDITO' || metodo === 'CARTAO_DEBITO') && (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número do Cartão
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cartao.numero}
                  onChange={handleNumeroChange}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {bandeira && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                    {bandeira}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome no Cartão
              </label>
              <input
                type="text"
                value={cartao.nome}
                onChange={(e) =>
                  setCartao({ ...cartao, nome: e.target.value.toUpperCase() })
                }
                placeholder="NOME COMO ESTÁ NO CARTÃO"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Validade
                </label>
                <input
                  type="text"
                  value={cartao.validade}
                  onChange={handleValidadeChange}
                  placeholder="MM/AA"
                  maxLength={5}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  value={cartao.cvv}
                  onChange={(e) =>
                    setCartao({ ...cartao, cvv: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mensagem para dinheiro */}
        {metodo === 'DINHEIRO' && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              O pagamento será realizado diretamente ao motoboy no momento da entrega.
              Tenha o valor em mãos.
            </p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
          <Button
            onClick={handlePagar}
            isLoading={isLoading}
            disabled={!metodo}
            className="flex-1"
          >
            {metodo === 'PIX' && 'Gerar PIX'}
            {metodo === 'CARTAO_CREDITO' && 'Pagar com Crédito'}
            {metodo === 'CARTAO_DEBITO' && 'Pagar com Débito'}
            {metodo === 'DINHEIRO' && 'Confirmar Dinheiro'}
            {!metodo && 'Selecione uma opção'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
