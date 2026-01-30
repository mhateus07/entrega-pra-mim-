'use client'

import { useCallback, useState } from 'react'
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api'

interface Coordenadas {
  latitude: number
  longitude: number
}

interface MapContainerProps {
  center?: Coordenadas
  zoom?: number
  markers?: Array<{
    position: Coordenadas
    title?: string
    icon?: 'origin' | 'destination' | 'motoboy'
  }>
  showRoute?: boolean
  origin?: Coordenadas
  destination?: Coordenadas
  onMapClick?: (lat: number, lng: number) => void
  className?: string
}

const containerStyle = {
  width: '100%',
  height: '100%',
}

const defaultCenter = {
  lat: -23.5505, // São Paulo
  lng: -46.6333,
}

// URLs dos ícones
const markerIconUrls: Record<string, string> = {
  origin: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#22c55e" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  destination: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  motoboy: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="32" height="32">
      <circle cx="12" cy="12" r="10"/>
      <path fill="white" d="M12 6l-4 8h8l-4-8z"/>
    </svg>
  `),
}

export default function MapContainer({
  center,
  zoom = 14,
  markers = [],
  showRoute = false,
  origin,
  destination,
  onMapClick,
  className,
}: MapContainerProps) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  const onLoad = useCallback((map: google.maps.Map) => {
    // Calcular rota se necessário
    if (showRoute && origin && destination) {
      const directionsService = new google.maps.DirectionsService()
      directionsService.route(
        {
          origin: { lat: origin.latitude, lng: origin.longitude },
          destination: { lat: destination.latitude, lng: destination.longitude },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            setDirections(result)
          }
        }
      )
    }
  }, [showRoute, origin, destination])

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (onMapClick && e.latLng) {
      onMapClick(e.latLng.lat(), e.latLng.lng())
    }
  }, [onMapClick])

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <p className="text-gray-500">Erro ao carregar o mapa</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const mapCenter = center
    ? { lat: center.latitude, lng: center.longitude }
    : defaultCenter

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={{
              lat: marker.position.latitude,
              lng: marker.position.longitude,
            }}
            title={marker.title}
            icon={marker.icon ? markerIconUrls[marker.icon] : undefined}
          />
        ))}

        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  )
}
