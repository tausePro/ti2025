// Qué puede descargar el navegador del servidor mientras arma un PDF. El HTML
// de los informes no es de confianza: no debe poder hacer que el servidor
// consulte direcciones internas.

const PRIVATE_HOSTS = /^(localhost|metadata(\.google)?\.internal)$|\.(local|internal|localhost)$/i
const IP_LITERAL = /^\[?[0-9a-f:.]+\]?$/i
const ALLOWED_TYPES = new Set(['image', 'font', 'stylesheet', 'media'])

/** Solo datos embebidos y archivos públicos por HTTPS de dominios con nombre. */
export function isAllowedPrintResource(url: string, resourceType: string): boolean {
  if (url.startsWith('data:')) return true
  if (!ALLOWED_TYPES.has(resourceType)) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false
  const host = parsed.hostname
  return !IP_LITERAL.test(host) && !PRIVATE_HOSTS.test(host) && host.includes('.')
}
