'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, CheckCheck, Loader2, MessageSquare, SendHorizontal, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface Mensagem {
  id: string
  remetente: 'CLIENTE' | 'MOTOBOY'
  conteudo: string
  lida: boolean
  createdAt: string
}

interface ChatBoxProps {
  pedidoId: string
  userType: 'CLIENTE' | 'MOTOBOY'
  enabled?: boolean
  className?: string
}

export default function ChatBox({
  pedidoId,
  userType,
  enabled = true,
  className = '',
}: ChatBoxProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMensagens = useCallback(async () => {
    if (!enabled) return

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/mensagens`)
      const data = await response.json()

      if (data.success) {
        setMensagens(data.data)

        // Contar mensagens não lidas do outro usuário
        const unread = data.data.filter(
          (m: Mensagem) => m.remetente !== userType && !m.lida
        ).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
    } finally {
      setIsLoading(false)
    }
  }, [pedidoId, enabled, userType])

  useEffect(() => {
    fetchMensagens()

    // Polling para novas mensagens
    const interval = setInterval(fetchMensagens, 5000)
    return () => clearInterval(interval)
  }, [fetchMensagens])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setUnreadCount(0)
    }
  }, [mensagens, isOpen])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novaMensagem.trim() || isSending) return

    setIsSending(true)

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: novaMensagem.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setMensagens((prev) => [...prev, data.data])
        setNovaMensagem('')
        inputRef.current?.focus()
      } else {
        toast.error(data.error || 'Erro ao enviar mensagem')
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error('Erro ao enviar mensagem')
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!enabled) return null

  const outro = userType === 'CLIENTE' ? 'entregador' : 'cliente'

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-fg shadow-pop transition-colors hover:bg-primary-hover"
          aria-label={`Abrir conversa com o ${outro}`}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Mensagens
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="flex max-h-[min(520px,80vh)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-pop sm:w-96" role="dialog" aria-label={`Conversa com o ${outro}`}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-fg">Conversa com o {outro}</p>
              <p className="text-xs text-fg-3">Mensagens deste pedido</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Fechar conversa">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-[300px] flex-1 space-y-2 overflow-y-auto bg-page px-4 py-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-fg-3" />
              </div>
            ) : mensagens.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare className="mb-2 h-5 w-5 text-fg-3" aria-hidden="true" />
                <p className="text-sm text-fg-2">Nenhuma mensagem ainda</p>
                <p className="mt-0.5 text-xs text-fg-3">Envie uma mensagem para combinar detalhes da entrega.</p>
              </div>
            ) : (
              mensagens.map((msg) => {
                const minha = msg.remetente === userType
                return (
                  <div key={msg.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${minha ? 'rounded-br-md bg-primary text-primary-fg' : 'rounded-bl-md border border-line bg-surface text-fg'}`}>
                      <p className="break-words text-sm">{msg.conteudo}</p>
                      <p className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] tabular ${minha ? 'opacity-60' : 'text-fg-3'}`}>
                        {formatTime(msg.createdAt)}
                        {minha && (msg.lida ? <CheckCheck className="h-3 w-3" aria-label="Lida" /> : <Check className="h-3 w-3" aria-label="Enviada" />)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
            <input
              ref={inputRef}
              type="text"
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              placeholder="Escreva uma mensagem"
              aria-label="Mensagem"
              className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-3 focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
              disabled={isSending}
              maxLength={1000}
            />
            <Button type="submit" size="icon" className="h-10 w-10" disabled={!novaMensagem.trim() || isSending} isLoading={isSending} aria-label="Enviar">
              {!isSending && <SendHorizontal className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
