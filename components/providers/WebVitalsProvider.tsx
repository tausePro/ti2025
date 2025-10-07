'use client'

import { useWebVitals } from '@/hooks/useWebVitals'

export function WebVitalsProvider() {
  // Inicializar el tracking de Web Vitals
  useWebVitals()

  // Este componente no renderiza nada visible
  return null
}