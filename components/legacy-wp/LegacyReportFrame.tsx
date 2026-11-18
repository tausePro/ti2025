'use client'

import { useEffect, useRef, useState } from 'react'

interface LegacyReportFrameProps {
  html: string
  title: string
}

/**
 * Muestra un informe histórico dentro de un iframe sin scripts, para que su
 * HTML y sus estilos no afecten la aplicación. allow-same-origin solo permite
 * que esta página mida la altura del contenido.
 */
export function LegacyReportFrame({ html, title }: LegacyReportFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(480)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    let observer: ResizeObserver | null = null
    const measure = () => {
      const root = frame.contentDocument?.documentElement
      if (root) setHeight(Math.ceil(root.getBoundingClientRect().height))
    }
    const attach = () => {
      measure()
      observer?.disconnect()
      const body = frame.contentDocument?.body
      if (!body) return
      observer = new ResizeObserver(measure)
      observer.observe(body)
    }
    frame.addEventListener('load', attach)
    window.addEventListener('resize', measure)
    return () => {
      frame.removeEventListener('load', attach)
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [html])

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={html}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="block w-full border-0"
      style={{ height }}
    />
  )
}
