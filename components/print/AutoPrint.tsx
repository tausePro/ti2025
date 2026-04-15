'use client'

import { useEffect } from 'react'

export function AutoPrint({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return

    // No auto-imprimir si Puppeteer está generando el PDF
    const params = new URLSearchParams(window.location.search)
    if (params.get('noPrint') === '1') return

    const timeout = setTimeout(() => {
      try {
        window.focus()
        window.print()
      } catch {
        // ignore
      }
    }, 800)

    return () => clearTimeout(timeout)
  }, [enabled])

  return null
}
