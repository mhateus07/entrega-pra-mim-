'use client'

import { useSyncExternalStore, useCallback } from 'react'
import toast from 'react-hot-toast'

const permissionSnapshot = (): NotificationPermission | 'unsupported' =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
const serverPermission = () => 'unsupported' as const
function subscribePermission(callback: () => void) {
  window.addEventListener('focus', callback)
  window.addEventListener('notification-permission', callback)
  return () => {
    window.removeEventListener('focus', callback)
    window.removeEventListener('notification-permission', callback)
  }
}
export function useNotifications() {
  const snapshot = useSyncExternalStore(subscribePermission, permissionSnapshot, serverPermission)
  const isSupported = snapshot !== 'unsupported'
  const permission: NotificationPermission = isSupported ? snapshot : 'default'

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Notificações não são suportadas neste navegador')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      window.dispatchEvent(new Event('notification-permission'))

      if (result === 'granted') {
        toast.success('Notificações ativadas!')
        return true
      } else {
        toast.error('Permissão de notificação negada')
        return false
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error)
      return false
    }
  }, [isSupported])

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      // Fallback para toast
      toast(title, {
        icon: '🔔',
      })
      return
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        ...options,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000)
    } catch (error) {
      console.error('Erro ao enviar notificação:', error)
      toast(title, { icon: '🔔' })
    }
  }, [isSupported, permission])

  const notifyOrderStatus = useCallback((status: string, pedidoId: string) => {
    const messages: Record<string, { title: string; body: string }> = {
      ACEITO: {
        title: 'Pedido Aceito! 🏍️',
        body: 'Um motoboy aceitou seu pedido e está a caminho da coleta.',
      },
      EM_COLETA: {
        title: 'Em Coleta 📦',
        body: 'O motoboy chegou ao local de coleta.',
      },
      EM_ENTREGA: {
        title: 'Em Entrega 🚀',
        body: 'Seu pedido está a caminho! Acompanhe em tempo real.',
      },
      ENTREGUE: {
        title: 'Entregue! ✅',
        body: 'Seu pedido foi entregue com sucesso. Avalie a entrega!',
      },
      CANCELADO: {
        title: 'Pedido Cancelado ❌',
        body: 'Infelizmente seu pedido foi cancelado.',
      },
    }

    const message = messages[status]
    if (message) {
      sendNotification(message.title, {
        body: message.body,
        tag: `pedido-${pedidoId}`,
      })
    }
  }, [sendNotification])

  const notifyNewOrder = useCallback((valorTotal: number, bairroOrigem: string) => {
    sendNotification('Novo Pedido Disponível! 💰', {
      body: `R$ ${valorTotal.toFixed(2)} - Coleta em ${bairroOrigem}`,
      tag: 'novo-pedido',
    })
  }, [sendNotification])

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    notifyOrderStatus,
    notifyNewOrder,
  }
}
