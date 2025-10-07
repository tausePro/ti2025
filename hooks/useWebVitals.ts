import { useEffect, useCallback } from 'react'
import { usePerformanceMetrics } from './usePerformanceMetrics'

interface WebVitalsMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
}

export function useWebVitals() {
  const { recordMetric } = usePerformanceMetrics()

  const getConnectionSpeed = (): string => {
    if (typeof navigator === 'undefined') return 'unknown'

    const connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection

    if (!connection) return 'unknown'

    return connection.effectiveType || 'unknown'
  }

  const getDeviceMemory = (): number => {
    if (typeof navigator === 'undefined') return 0
    return (navigator as any).deviceMemory || 0
  }

  const getHardwareConcurrency = (): number => {
    if (typeof navigator === 'undefined') return 0
    return navigator.hardwareConcurrency || 0
  }

  const recordWebVitals = useCallback(async (metric: WebVitalsMetric) => {
    try {
      const metadata = {
        rating: metric.rating,
        navigationType: metric.navigationType,
        connectionSpeed: getConnectionSpeed(),
        deviceMemory: getDeviceMemory(),
        hardwareConcurrency: getHardwareConcurrency(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight
        } : null,
        timestamp: Date.now()
      }

      await recordMetric(
        'page_load_time',
        metric.name,
        metric.value,
        metadata
      )
    } catch (error) {
      console.error('Error recording web vitals:', error)
    }
  }, [recordMetric])

  const measureLCP = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        resolve()
        return
      }

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any

        if (lastEntry) {
          recordWebVitals({
            name: 'LCP',
            value: lastEntry.startTime,
            rating: lastEntry.startTime > 4000 ? 'poor' : lastEntry.startTime > 2500 ? 'needs-improvement' : 'good',
            delta: lastEntry.startTime,
            id: lastEntry.id,
            navigationType: 'navigate'
          })
        }
        resolve()
      })

      observer.observe({ entryTypes: ['largest-contentful-paint'] })

      // Fallback timeout
      setTimeout(() => {
        observer.disconnect()
        resolve()
      }, 10000)
    })
  }, [recordWebVitals])

  const measureFID = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        resolve()
        return
      }

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          recordWebVitals({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: entry.processingStart - entry.startTime > 300 ? 'poor' : entry.processingStart - entry.startTime > 100 ? 'needs-improvement' : 'good',
            delta: entry.processingStart - entry.startTime,
            id: entry.id,
            navigationType: 'navigate'
          })
        })
        resolve()
      })

      observer.observe({ entryTypes: ['first-input'] })

      // Fallback timeout
      setTimeout(() => {
        observer.disconnect()
        resolve()
      }, 10000)
    })
  }, [recordWebVitals])

  const measureCLS = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        resolve()
        return
      }

      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
      })

      observer.observe({ entryTypes: ['layout-shift'] })

      // Report final CLS value
      setTimeout(() => {
        observer.disconnect()
        recordWebVitals({
          name: 'CLS',
          value: clsValue,
          rating: clsValue > 0.25 ? 'poor' : clsValue > 0.1 ? 'needs-improvement' : 'good',
          delta: clsValue,
          id: 'cls-' + Date.now(),
          navigationType: 'navigate'
        })
        resolve()
      }, 5000)
    })
  }, [recordWebVitals])

  const measureNavigationTiming = useCallback(async () => {
    if (typeof window === 'undefined' || !('performance' in window)) return

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    if (navigation) {
      const metadata = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        requestStart: navigation.requestStart,
        responseStart: navigation.responseStart,
        responseEnd: navigation.responseEnd,
        connectionSpeed: getConnectionSpeed(),
        deviceMemory: getDeviceMemory(),
        hardwareConcurrency: getHardwareConcurrency()
      }

      await recordMetric(
        'api_response_time',
        'navigation_timing',
        navigation.loadEventEnd - navigation.startTime,
        metadata
      )

      // DNS Lookup time
      if (navigation.domainLookupEnd > navigation.domainLookupStart) {
        await recordMetric(
          'api_response_time',
          'dns_lookup',
          navigation.domainLookupEnd - navigation.domainLookupStart,
          { stage: 'dns' }
        )
      }

      // Connection time
      if (navigation.connectEnd > navigation.connectStart) {
        await recordMetric(
          'api_response_time',
          'connection_time',
          navigation.connectEnd - navigation.connectStart,
          { stage: 'connection' }
        )
      }

      // Response time
      if (navigation.responseEnd > navigation.responseStart) {
        await recordMetric(
          'api_response_time',
          'response_time',
          navigation.responseEnd - navigation.responseStart,
          { stage: 'response' }
        )
      }
    }
  }, [recordMetric])

  const measureResourceTiming = useCallback(async () => {
    if (typeof window === 'undefined' || !('performance' in window)) return

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    for (const resource of resources) {
      if (resource.duration > 1000) { // Solo recursos que tardaron más de 1 segundo
        await recordMetric(
          'api_response_time',
          `resource_${resource.name.split('/').pop() || 'unknown'}`,
          resource.duration,
          {
            resource: resource.name,
            type: resource.initiatorType,
            size: resource.transferSize
          }
        )
      }
    }
  }, [recordMetric])

  const startWebVitalsTracking = useCallback(async () => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return

    try {
      // Medir métricas principales
      await Promise.all([
        measureLCP(),
        measureFID(),
        measureCLS(),
        measureNavigationTiming(),
        measureResourceTiming()
      ])

      // Registrar información del sistema
      await recordMetric(
        'system_health',
        'system_info',
        1,
        {
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          screen: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth
          },
          connection: getConnectionSpeed(),
          deviceMemory: getDeviceMemory(),
          hardwareConcurrency: getHardwareConcurrency(),
          timestamp: Date.now()
        }
      )

    } catch (error) {
      console.error('Error in web vitals tracking:', error)
    }
  }, [measureLCP, measureFID, measureCLS, measureNavigationTiming, measureResourceTiming, recordMetric])

  useEffect(() => {
    // Iniciar el tracking cuando el componente se monte
    startWebVitalsTracking()

    // Agregar listener para errores
    const handleError = (event: ErrorEvent) => {
      recordMetric(
        'error_rate',
        'javascript_error',
        1,
        {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.toString(),
          stack: event.error?.stack?.substring(0, 500) // Limitar el tamaño del stack
        }
      )
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordMetric(
        'error_rate',
        'unhandled_promise_rejection',
        1,
        {
          reason: event.reason?.toString(),
          type: 'unhandledrejection'
        }
      )
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [startWebVitalsTracking, recordMetric])

  return {
    startWebVitalsTracking
  }
}