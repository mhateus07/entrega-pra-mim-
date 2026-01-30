'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useNotifications } from './useNotifications'

interface TrackingData {
  id: string
  status: string
  tipoServico: string
  aceitoEm: string | null
  coletadoEm: string | null
  entregueEm: string | null
  etaMinutos: number | null
  atualizadoEm: string
  motoboy: {
    id: string
    latitudeAtual: number | null
    longitudeAtual: number | null
    ultimaAtividade: string | null
    status: string
    user: {
      nome: string
      telefone: string
    }
  } | null
  enderecoOrigem: {
    latitude: number | null
    longitude: number | null
    logradouro: string
    numero: string
    bairro: string
  }
  enderecoDestino: {
    latitude: number | null
    longitude: number | null
    logradouro: string
    numero: string
    bairro: string
  }
}

interface UseTrackingOptions {
  pedidoId: string
  enabled?: boolean
  pollingInterval?: number // em ms
  onStatusChange?: (newStatus: string, oldStatus: string) => void
}

export function useTracking({
  pedidoId,
  enabled = true,
  pollingInterval = 5000, // 5 segundos
  onStatusChange,
}: UseTrackingOptions) {
  const [data, setData] = useState<TrackingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousStatusRef = useRef<string | null>(null)
  const { notifyOrderStatus } = useNotifications()

  const fetchTracking = useCallback(async () => {
    if (!pedidoId || !enabled) return

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/rastreamento`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)

        // Verificar mudança de status
        const newStatus = result.data.status
        const oldStatus = previousStatusRef.current

        if (oldStatus && newStatus !== oldStatus) {
          notifyOrderStatus(newStatus, pedidoId)
          onStatusChange?.(newStatus, oldStatus)
        }

        previousStatusRef.current = newStatus
      } else {
        setError(result.error || 'Erro ao carregar rastreamento')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }, [pedidoId, enabled, notifyOrderStatus, onStatusChange])

  useEffect(() => {
    if (!enabled) return

    // Fetch inicial
    fetchTracking()

    // Polling para atualizações
    const interval = setInterval(fetchTracking, pollingInterval)

    return () => clearInterval(interval)
  }, [fetchTracking, enabled, pollingInterval])

  const refresh = useCallback(() => {
    setIsLoading(true)
    fetchTracking()
  }, [fetchTracking])

  return {
    data,
    isLoading,
    error,
    refresh,
  }
}

// Hook para motoboy enviar sua localização
export function useLocationSharing(motoboyId: string | null, enabled = false) {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const startSharing = useCallback(() => {
    if (!motoboyId || !enabled) return

    if (!navigator.geolocation) {
      setError('Geolocalização não suportada')
      return
    }

    setIsSharing(true)
    setError(null)

    const sendLocation = async (position: GeolocationPosition) => {
      try {
        await fetch(`/api/motoboys/${motoboyId}/localizacao`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        })
      } catch (err) {
        console.error('Erro ao enviar localização:', err)
      }
    }

    // Enviar localização imediatamente
    navigator.geolocation.getCurrentPosition(sendLocation, (err) => {
      setError(`Erro de localização: ${err.message}`)
    })

    // Continuar atualizando
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => {
        setError(`Erro de localização: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    )
  }, [motoboyId, enabled])

  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsSharing(false)
  }, [])

  useEffect(() => {
    if (enabled && motoboyId) {
      startSharing()
    } else {
      stopSharing()
    }

    return () => stopSharing()
  }, [enabled, motoboyId, startSharing, stopSharing])

  return {
    isSharing,
    error,
    startSharing,
    stopSharing,
  }
}
