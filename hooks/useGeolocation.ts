'use client'

import { useState, useEffect } from 'react'

interface GeolocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

interface UseGeolocationReturn {
  location: GeolocationData | null
  error: string | null
  loading: boolean
  requestLocation: () => Promise<GeolocationData | null>
}

export function useGeolocation(autoRequest = false): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const requestLocation = async (): Promise<GeolocationData | null> => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocalización no soportada en este navegador'
      setError(errorMsg)
      return null
    }

    setLoading(true)
    setError(null)

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          }
          setLocation(data)
          setLoading(false)
          resolve(data)
        },
        (err) => {
          let errorMsg = 'Error obteniendo ubicación'
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'Permiso de ubicación denegado'
              break
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'Ubicación no disponible'
              break
            case err.TIMEOUT:
              errorMsg = 'Tiempo de espera agotado'
              break
          }
          
          setError(errorMsg)
          setLoading(false)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  useEffect(() => {
    if (autoRequest) {
      requestLocation()
    }
  }, [autoRequest])

  return { location, error, loading, requestLocation }
}
