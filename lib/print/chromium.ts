import type { Browser } from 'puppeteer-core'
import { isAllowedPrintResource } from './print-security'

// PDF a partir de HTML con Chromium. En Vercel (Linux) se usa el Chromium de
// @sparticuz/chromium; en desarrollo, el Chrome instalado en el equipo
// (CHROME_EXECUTABLE_PATH o la ruta estándar de macOS).
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function launchBrowser(): Promise<Browser> {
  const puppeteer = (await import('puppeteer-core')).default
  const localChrome = process.env.CHROME_EXECUTABLE_PATH || (process.platform === 'darwin' ? MAC_CHROME : '')
  if (process.platform !== 'linux' && localChrome) {
    return puppeteer.launch({ executablePath: localChrome, headless: true, args: ['--no-first-run', '--disable-extensions'] })
  }
  const chromium = (await import('@sparticuz/chromium')).default
  return puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    executablePath: await chromium.executablePath(),
    headless: 'shell'
  })
}

/**
 * Convierte un documento HTML en PDF. Sin JavaScript y solo con recursos
 * permitidos (imágenes y fuentes públicas por HTTPS o embebidas).
 */
export async function renderPdf(
  html: string,
  { timeoutMs = 90_000, pageRanges }: { timeoutMs?: number; pageRanges?: string } = {}
): Promise<Uint8Array> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on('request', request => {
      if (isAllowedPrintResource(request.url(), request.resourceType())) request.continue()
      else request.abort()
    })
    // 'load' espera todas las imágenes: el HTML de impresión no usa carga diferida
    await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs })
    return await page.pdf({ printBackground: true, preferCSSPageSize: true, timeout: timeoutMs, pageRanges })
  } finally {
    await browser.close()
  }
}
