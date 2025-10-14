import { useEffect, useRef, useState } from 'react'

interface UseIdleTimeoutOptions {
  onIdle: () => void
  idleTime?: number // en milisegundos
  warningTime?: number // tiempo antes del logout para mostrar advertencia
  onWarning?: () => void
}

export function useIdleTimeout({
  onIdle,
  idleTime = 30 * 60 * 1000, // 30 minutos por defecto
  warningTime = 2 * 60 * 1000, // 2 minutos de advertencia
  onWarning
}: UseIdleTimeoutOptions) {
  const [isIdle, setIsIdle] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  
  const idleTimerRef = useRef<NodeJS.Timeout>()
  const warningTimerRef = useRef<NodeJS.Timeout>()
  const countdownRef = useRef<NodeJS.Timeout>()

  const resetTimer = () => {
    setIsIdle(false)
    setShowWarning(false)
    
    // Limpiar timers existentes
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    // Timer para advertencia
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setTimeRemaining(warningTime)
      
      if (onWarning) {
        onWarning()
      }

      // Countdown
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            return 0
          }
          return prev - 1000
        })
      }, 1000)
    }, idleTime - warningTime)

    // Timer para logout
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true)
      onIdle()
    }, idleTime)
  }

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    const handleActivity = () => {
      resetTimer()
    }

    // Agregar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Iniciar timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [idleTime, warningTime])

  return {
    isIdle,
    showWarning,
    timeRemaining,
    resetTimer
  }
}
