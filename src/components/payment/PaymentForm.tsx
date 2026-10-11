'use client'

import { useRef, useState } from 'react'
import { ELECTRONIC_PAYMENTS_AVAILABLE } from '@/lib/payment-policy'
import { Banknote, CreditCard, Info, QrCode } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Feedback'
import { cn } from '@/utils/cn'
import { novaChaveIdempotencia } from '@/utils/idempotency-key'
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

  // Evita cobrança duplicada se a mesma tentativa for reenviada sem resposta
  const chavePagamento = useRef<string | null>(null)

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

      chavePagamento.current ??= novaChaveIdempotencia()
      const response = await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': chavePagamento.current },
        body: JSON.stringify(payload),
      })
      chavePagamento.current = null

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

  const icones: Record<MetodoPagamento, typeof QrCode> = {
    PIX: QrCode,
    CARTAO_CREDITO: CreditCard,
    CARTAO_DEBITO: CreditCard,
    DINHEIRO: Banknote,
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <CardTitle>Pagamento</CardTitle>
        <p className="text-2xl font-semibold tracking-tight tabular text-fg">{formatarValor(valorTotal)}</p>
      </div>

      <div className="mt-5 space-y-5">
        <Alert variant={ELECTRONIC_PAYMENTS_AVAILABLE ? 'info' : 'warning'} icon={Info}>
          {ELECTRONIC_PAYMENTS_AVAILABLE
            ? 'Ambiente de demonstração: Pix e cartão são simulados. Não informe dados reais de cartão.'
            : 'No momento, o pagamento é realizado em dinheiro na entrega.'}
        </Alert>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de pagamento">
          {(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO'] as MetodoPagamento[]).filter(m => ELECTRONIC_PAYMENTS_AVAILABLE || m === 'DINHEIRO').map((m) => {
            const Icon = icones[m]
            const ativo = metodo === m
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => setMetodo(m)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3.5 text-left transition-colors',
                  ativo ? 'border-fg ring-1 ring-fg' : 'border-line-strong hover:border-fg-3'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] shrink-0', ativo ? 'text-brand' : 'text-fg-3')} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-medium text-fg">{LABELS_METODO_PAGAMENTO[m]}</span>
                  {m === 'PIX' && <span className="block text-xs text-fg-3">Aprovação imediata</span>}
                  {m === 'DINHEIRO' && <span className="block text-xs text-fg-3">Pago na entrega</span>}
                </span>
              </button>
            )
          })}
        </div>

        {(metodo === 'CARTAO_CREDITO' || metodo === 'CARTAO_DEBITO') && (
          <div className="space-y-4 rounded-lg border border-line bg-surface-2/50 p-4">
            <Input
              label="Número do cartão"
              value={cartao.numero}
              onChange={handleNumeroChange}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              inputMode="numeric"
              autoComplete="cc-number"
              trailing={bandeira ? <span className="pr-1 text-xs font-medium text-fg-3">{bandeira}</span> : undefined}
            />
            <Input
              label="Nome impresso no cartão"
              value={cartao.nome}
              onChange={(e) => setCartao({ ...cartao, nome: e.target.value.toUpperCase() })}
              autoComplete="cc-name"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Validade" value={cartao.validade} onChange={handleValidadeChange} placeholder="MM/AA" maxLength={5} inputMode="numeric" autoComplete="cc-exp" />
              <Input label="CVV" value={cartao.cvv} onChange={(e) => setCartao({ ...cartao, cvv: e.target.value.replace(/\D/g, '') })} maxLength={4} inputMode="numeric" autoComplete="cc-csc" />
            </div>
          </div>
        )}

        {metodo === 'DINHEIRO' && (
          <p className="text-[13px] text-fg-2">O pagamento é feito diretamente ao entregador no momento da entrega. Tenha o valor em mãos.</p>
        )}

        <div className="flex gap-2 border-t border-line pt-5">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
          <Button onClick={handlePagar} isLoading={isLoading} disabled={!metodo} className="flex-1">
            {metodo === 'PIX' && 'Gerar código Pix'}
            {metodo === 'CARTAO_CREDITO' && 'Pagar com crédito'}
            {metodo === 'CARTAO_DEBITO' && 'Pagar com débito'}
            {metodo === 'DINHEIRO' && 'Confirmar pedido'}
            {!metodo && 'Escolha uma forma de pagamento'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
