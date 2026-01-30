'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [markers, setMarkers] = useState<{
    origem: google.maps.Marker | null
    destino: google.maps.Marker | null
    motoboy: google.maps.Marker | null
  }>({ origem: null, destino: null, motoboy: null })
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Inicializar mapa
  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
        libraries: ['places'],
      })

      try {
        await loader.load()

        if (!mapRef.current) return

        const center = origem
          ? { lat: origem.lat, lng: origem.lng }
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

        const renderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeWeight: 4,
          },
        })

        setMap(mapInstance)
        setDirectionsRenderer(renderer)
        setIsLoaded(true)
      } catch (error) {
        console.error('Erro ao carregar mapa:', error)
      }
    }

    initMap()
  }, [])

  // Atualizar marcadores
  useEffect(() => {
    if (!map || !isLoaded) return

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
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: 'Coleta',
        })
        setMarkers(prev => ({ ...prev, origem: marker }))
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
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: 'Entrega',
        })
        setMarkers(prev => ({ ...prev, destino: marker }))
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
                <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="#fff" stroke-width="3"/>
                <text x="20" y="26" text-anchor="middle" fill="#fff" font-size="18">🏍️</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
          },
          title: 'Motoboy',
          zIndex: 1000,
        })
        setMarkers(prev => ({ ...prev, motoboy: marker }))
      }

      // Centralizar no motoboy
      map.panTo({ lat: motoboyLocation.lat, lng: motoboyLocation.lng })
    }
  }, [map, isLoaded, origem, destino, motoboyLocation])

  // Desenhar rota
  useEffect(() => {
    if (!map || !directionsRenderer || !origem || !destino) return

    const directionsService = new google.maps.DirectionsService()

    directionsService.route(
      {
        origin: { lat: origem.lat, lng: origem.lng },
        destination: { lat: destino.lat, lng: destino.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result)
        }
      }
    )
  }, [map, directionsRenderer, origem, destino])

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
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-700 dark:text-gray-300">Coleta</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-700 dark:text-gray-300">Entrega</span>
        </div>
        {motoboyLocation && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Motoboy</span>
          </div>
        )}
      </div>
    </div>
  )
}
