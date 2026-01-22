'use client'

import { useEffect } from 'react'

export function AutoPrint({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return

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
