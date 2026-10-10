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
    } catch {
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
  const [requested, setRequested] = useState(true)
  const [locationState, setLocationState] = useState<{ id: string; sharing: boolean; error: string | null } | null>(null)
  useEffect(() => {
    if (!enabled || !requested || !motoboyId || !navigator.geolocation) return
    let active = true
    const controller = new AbortController()
    // O servidor aceita até 30 envios/min; 1 a cada 5s é suficiente para o rastreamento
    let ultimoEnvio = 0
    const sendLocation = async (position: GeolocationPosition) => {
      if (!active || Date.now() - ultimoEnvio < 5000) return
      ultimoEnvio = Date.now()
      try {
        const response = await fetch(`/api/motoboys/${motoboyId}/localizacao`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        })
        if (!response.ok) throw new Error('Não foi possível compartilhar localização')
        if (active) setLocationState({ id: motoboyId, sharing: true, error: null })
      } catch (error) {
        if (active) setLocationState({ id: motoboyId, sharing: false, error: error instanceof Error ? error.message : 'Erro de localização' })
      }
    }
    const fail = (error: GeolocationPositionError) => {
      if (active) setLocationState({ id: motoboyId, sharing: false, error: `Erro de localização: ${error.message}` })
    }
    navigator.geolocation.getCurrentPosition(sendLocation, fail)
    const watchId = navigator.geolocation.watchPosition(sendLocation, fail, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 })
    return () => { active = false; controller.abort(); navigator.geolocation.clearWatch(watchId) }
  }, [enabled, requested, motoboyId])
  const startSharing = useCallback(() => setRequested(true), [])
  const stopSharing = useCallback(() => setRequested(false), [])
  return {
    isSharing: enabled && requested && locationState?.id === motoboyId && locationState.sharing,
    error: locationState?.id === motoboyId ? locationState.error : null,
    startSharing, stopSharing,
  }
}
