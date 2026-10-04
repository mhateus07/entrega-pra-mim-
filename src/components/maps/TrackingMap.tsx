'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPinOff } from 'lucide-react'
import { Loader } from '@googlemaps/js-api-loader'

interface Location {
  lat: number
  lng: number
  label?: string
}

interface TrackingMapProps {
  origem: Location | null
  destino: Location | null
  motoboyLocation: Location | null
  className?: string
}

export default function TrackingMap({
  origem,
  destino,
  motoboyLocation,
  className = '',
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const markersRef = useRef<{
    origem: google.maps.Marker | null
    destino: google.maps.Marker | null
    motoboy: google.maps.Marker | null
  }>({ origem: null, destino: null, motoboy: null })
  const initialOrigin = useRef(origem)
  const [isLoaded, setIsLoaded] = useState(false)
  const [falhou, setFalhou] = useState(!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

  // Inicializar mapa
  useEffect(() => {
    let cancelled = false
    const initMap = async () => {
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
        libraries: ['geometry'],
      })

      try {
        await loader.load()

        if (cancelled || !mapRef.current) return

        const center = initialOrigin.current
          ? { lat: initialOrigin.current.lat, lng: initialOrigin.current.lng }
          : { lat: -23.5505, lng: -46.6333 } // São Paulo como fallback

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom: 14,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })

        setMap(mapInstance)
        setIsLoaded(true)
      } catch (error) {
        console.error('Erro ao carregar mapa:', error)
        if (!cancelled) setFalhou(true)
      }
    }

    initMap()
    const markers = markersRef.current
    return () => {
      cancelled = true
      for (const key of ['origem', 'destino', 'motoboy'] as const) {
        markers[key]?.setMap(null)
        markers[key] = null
      }
    }
  }, [])

  // Atualizar marcadores
  useEffect(() => {
    if (!map || !isLoaded) return

    const markers = markersRef.current
    for (const [key, position] of [['origem', origem], ['destino', destino], ['motoboy', motoboyLocation]] as const) {
      if (!position) { markers[key]?.setMap(null); markers[key] = null }
    }

    // Marcador de origem
    if (origem) {
      if (markers.origem) {
        markers.origem.setPosition({ lat: origem.lat, lng: origem.lng })
      } else {
        const marker = new google.maps.Marker({
          position: { lat: origem.lat, lng: origem.lng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#121211',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: 'Coleta',
        })
        markers.origem = marker
      }
    }

    // Marcador de destino
    if (destino) {
      if (markers.destino) {
        markers.destino.setPosition({ lat: destino.lat, lng: destino.lng })
      } else {
        const marker = new google.maps.Marker({
          position: { lat: destino.lat, lng: destino.lng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#E2570F',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: 'Entrega',
        })
        markers.destino = marker
      }
    }

    // Marcador do motoboy (animado)
    if (motoboyLocation) {
      if (markers.motoboy) {
        markers.motoboy.setPosition({ lat: motoboyLocation.lat, lng: motoboyLocation.lng })
      } else {
        const marker = new google.maps.Marker({
          position: { lat: motoboyLocation.lat, lng: motoboyLocation.lng },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="17" fill="#2a78d6" fill-opacity="0.18"/>
                <circle cx="20" cy="20" r="9" fill="#2a78d6" stroke="#fff" stroke-width="3"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
          },
          title: 'Entregador',
          zIndex: 1000,
        })
        markers.motoboy = marker
      }

      // Centralizar no motoboy
      map.panTo({ lat: motoboyLocation.lat, lng: motoboyLocation.lng })
    }
  }, [map, isLoaded, origem, destino, motoboyLocation])

  // Desenhar rota: o traçado vem do servidor (Routes API); sem ele, liga os pontos em linha reta
  const routeLine = useRef<google.maps.Polyline | null>(null)
  const origemKey = origem ? `${origem.lat},${origem.lng}` : ''
  const destinoKey = destino ? `${destino.lat},${destino.lng}` : ''
  useEffect(() => {
    if (!map || !isLoaded || !origem || !destino) return
    let active = true

    const desenhar = (path: google.maps.LatLngLiteral[] | google.maps.LatLng[], reta: boolean) => {
      routeLine.current?.setMap(null)
      routeLine.current = new google.maps.Polyline({
        map,
        path,
        strokeColor: '#2a78d6',
        strokeOpacity: reta ? 0 : 0.9,
        strokeWeight: 4,
        icons: reta ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 3 }, offset: '0', repeat: '14px' }] : undefined,
      })
    }

    fetch('/api/rotas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origemLatitude: origem.lat,
        origemLongitude: origem.lng,
        destinoLatitude: destino.lat,
        destinoLongitude: destino.lng,
        tipoServico: 'AGENDADA',
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const encoded: string | undefined = data?.data?.polyline
        if (encoded && google.maps.geometry?.encoding) desenhar(google.maps.geometry.encoding.decodePath(encoded), false)
        else desenhar([origem, destino], true)
      })
      .catch(() => { if (active) desenhar([origem, destino], true) })

    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redesenha só quando os pontos mudam de fato
  }, [map, isLoaded, origemKey, destinoKey])

  useEffect(() => () => { routeLine.current?.setMap(null) }, [])

  // Ajustar bounds para mostrar todos os pontos
  useEffect(() => {
    if (!map || !isLoaded) return

    const bounds = new google.maps.LatLngBounds()
    let hasPoints = false

    if (origem) {
      bounds.extend({ lat: origem.lat, lng: origem.lng })
      hasPoints = true
    }
    if (destino) {
      bounds.extend({ lat: destino.lat, lng: destino.lng })
      hasPoints = true
    }
    if (motoboyLocation) {
      bounds.extend({ lat: motoboyLocation.lat, lng: motoboyLocation.lng })
      hasPoints = true
    }

    if (hasPoints) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    }
  }, [map, isLoaded, origem, destino, motoboyLocation])

  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      <div ref={mapRef} className="h-full w-full" />

      {falhou ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <MapPinOff className="h-5 w-5 text-fg-3" aria-hidden="true" />
          <p className="text-sm font-medium text-fg-2">Mapa indisponível no momento</p>
          <p className="max-w-xs text-xs text-fg-3">O acompanhamento continua pelas etapas do pedido.</p>
        </div>
      ) : !isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-fg-3" aria-hidden="true" />
        </div>
      ) : null}

      {!falhou && (
        <div className="absolute bottom-3 left-3 flex gap-3 rounded-lg border border-line bg-surface/95 px-3 py-2 text-xs text-fg-2 shadow-card backdrop-blur">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#121211] ring-2 ring-white" />Coleta</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#E2570F] ring-2 ring-white" />Entrega</span>
          {motoboyLocation && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#2a78d6] ring-2 ring-white" />Entregador</span>}
        </div>
      )}
    </div>
  )
}
