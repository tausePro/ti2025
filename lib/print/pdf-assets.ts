import fs from 'fs'
import path from 'path'

// Membrete y fuente embebidos en el HTML del PDF: así el resultado no depende
// de lo que tenga instalado el servidor. Las rutas deben estar incluidas en
// outputFileTracingIncludes (next.config.js) para que lleguen a Vercel.

let cached: { membreteDataUrl: string; fontCss: string } | null = null

function fontFace(weight: 400 | 700, style: 'normal' | 'italic'): string {
  const file = path.join(process.cwd(), 'node_modules', '@fontsource', 'arimo', 'files', `arimo-latin-${weight}-${style}.woff2`)
  const data = fs.readFileSync(file).toString('base64')
  return `@font-face{font-family:'Arimo';font-style:${style};font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2')}`
}

export function loadPdfAssets(): { membreteDataUrl: string; fontCss: string } {
  if (cached) return cached
  const membrete = fs.readFileSync(path.join(process.cwd(), 'public', 'brand', 'Membrete Talento Inmobiliario.jpg'))
  cached = {
    membreteDataUrl: `data:image/jpeg;base64,${membrete.toString('base64')}`,
    fontCss: [fontFace(400, 'normal'), fontFace(700, 'normal'), fontFace(400, 'italic'), fontFace(700, 'italic')].join('')
  }
  return cached
}
