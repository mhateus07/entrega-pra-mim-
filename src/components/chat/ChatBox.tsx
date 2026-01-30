'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Box */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-80 sm:w-96 flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="font-semibold">
                Chat com {userType === 'CLIENTE' ? 'Motoboy' : 'Cliente'}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700 rounded p-1 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : mensagens.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center">
                <div>
                  <svg
                    className="w-12 h-12 mx-auto mb-2 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-xs mt-1">Inicie uma conversa!</p>
                </div>
              </div>
            ) : (
              mensagens.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.remetente === userType ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.remetente === userType
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.conteudo}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.remetente === userType
                          ? 'text-blue-200'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                      {msg.remetente === userType && (
                        <span className="ml-1">
                          {msg.lida ? '✓✓' : '✓'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t dark:border-gray-700"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                disabled={isSending}
                maxLength={1000}
              />
              <Button
                type="submit"
                disabled={!novaMensagem.trim() || isSending}
                isLoading={isSending}
                className="!px-4"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
