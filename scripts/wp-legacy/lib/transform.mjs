// Transformaciones puras para importar la plataforma anterior (WordPress).
// Sin acceso a red ni a disco: todo se puede probar con datos de entrada.
import { createHash } from 'node:crypto'

// "febero" aparece como errata en títulos reales.
const MONTHS = {
  enero: 1, febrero: 2, febero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
}
const MONTH = `(${Object.keys(MONTHS).join('|')})`

/** Orden de impresión de las secciones del informe (plantilla print-document de WordPress). */
export const SECTION_ORDER = [
  'contenido',
  'informacion-general',
  'control-de-avance-general-de-obra',
  'programa-de-control-y-seguimiento',
  'control-y-seguimiento-de-entrega-de-apartamentos',
  'control-y-manejo-ambiental',
  'control-presupuestal',
  'observaciones-y-recomendaciones',
  'registro-fotografico-galeria',
  'registro-fotografico',
  'seccion-ii'
]

export const GALLERY_KEY = 'registro-fotografico-galeria'

const SIGNATURE_FIELDS = {
  'firma-directora-general': 'directora_general',
  'firma-coordinador-de-proyectos': 'coordinador_de_proyectos',
  'firma-residente': 'residente',
  'firma-director-interventoria': 'director_interventoria'
}

// Hosts desde los que el sitio anterior sirvió wp-content/uploads: el dominio
// propio y el CDN de Kinsta al que apuntan algunos informes de 2020.
const UPLOADS_HOST = '(?:(?:www\\.)?app\\.talentoinmobiliario\\.com|mk0apptalentoinx2txr\\.kinstacdn\\.com)'
const UPLOADS_URL = new RegExp(`(?:https?:)?//${UPLOADS_HOST}/wp-content/uploads/[^\\s"'<>),]+`, 'gi')
const UPLOADS_URL_PATH = new RegExp(`^(?:https?:)?//${UPLOADS_HOST}/wp-content/uploads/([^?#]+)`, 'i')

/**
 * UUID estable para un registro creado a partir de un ID de WordPress: repetir
 * la importación produce siempre el mismo identificador y no duplica filas.
 */
export function stableUuid(entity, wpId) {
  const hex = createHash('sha1').update(`talento-legacy-wp:${entity}:${wpId}`).digest('hex')
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`
}

/** Minúsculas y sin tildes. */
export function fold(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Tipo de informe, incluidas abreviaturas ("QUINC", "MENS") y erratas reales
 * ("QUICENAL", "MESUAL").
 * @returns {'mensual' | 'quincenal' | 'otro'}
 */
export function classifyReport(title) {
  const t = fold(title)
  if (/\bquin?c/.test(t)) return 'quincenal'
  if (/\bmen?s(u|\b)/.test(t)) return 'mensual'
  return 'otro'
}

/** Número del informe en títulos como "N°12", "N° 12", "# 10" o "No. 5". */
export function parseReportNumber(title) {
  const m = fold(title).match(/(?:\bn\s*[°º]|\bno\.?\s|\bnumero\s|#)\s*(\d{1,3})\b/)
  return m ? Number(m[1]) : null
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildRange(y1, m1, d1, y2, m2, d2) {
  const start = isoDate(y1, m1, Math.min(Math.max(d1, 1), daysInMonth(y1, m1)))
  const end = isoDate(y2, m2, Math.min(Math.max(d2, 1), daysInMonth(y2, m2)))
  return start <= end ? { start, end } : null
}

function crossRange(y1, m1, d1, y2, m2, d2) {
  const startYear = y1 ?? (m1 > m2 ? y2 - 1 : y2)
  return buildRange(startYear, m1, d1, y2, m2, d2)
}

function wholeMonth(year, month) {
  return { start: isoDate(year, month, 1), end: isoDate(year, month, daysInMonth(year, month)) }
}

/**
 * Período del informe a partir del título. WordPress no guarda el período en
 * un campo propio (fecha-finalizacion-informe está vacío en todos los informes).
 * Si el título solo trae el mes, sin año, se usa el año de referenceDate
 * (fecha de notificación o de última edición): el período es la última vez
 * que ocurrió ese mes hasta esa fecha.
 * @param {string} title
 * @param {string | null} [referenceDate] fecha ISO posterior al período
 * @returns {{ start: string, end: string, source: 'rango_del_titulo' | 'mes_del_titulo' | 'mes_del_titulo_y_fecha' } | null}
 */
export function parsePeriod(title, referenceDate = null) {
  const t = fold(title).replace(/\s+/g, ' ')
  const M = `\\b${MONTH}(?![a-z])`
  const TO = '(?:al|a)'
  const Y = '(?:,|\\s*-)?\\s+(?:de |del )?(\\d{4})'
  const n = value => (value === undefined ? null : Number(value))
  const range = (...args) => {
    const r = crossRange(...args)
    return r ? { ...r, source: 'rango_del_titulo' } : null
  }

  // "del 16 de octubre al 15 de noviembre de 2023", "del 26 de diciembre de 2022 al 25 de enero de 2023"
  let m = t.match(new RegExp(`(\\d{1,2}) de ${M}(?: (?:de|del) (\\d{4}))? ${TO} (\\d{1,2}) de ${M}${Y}`))
  if (m) {
    const r = range(n(m[3]), MONTHS[m[2]], n(m[1]), n(m[6]), MONTHS[m[5]], n(m[4]))
    if (r) return r
  }

  // "marzo 01 a marzo 15 de 2021"
  m = t.match(new RegExp(`${M} ?(\\d{1,2})(?:,? (?:de|del) (\\d{4}))? ${TO} ${M} ?(\\d{1,2})${Y}`))
  if (m) {
    const r = range(n(m[3]), MONTHS[m[1]], n(m[2]), n(m[6]), MONTHS[m[4]], n(m[5]))
    if (r) return r
  }

  // "del 1 al 31 de octubre de 2026", "del 01 al 30 de diciembre 2022"
  m = t.match(new RegExp(`(\\d{1,2}) ${TO} (\\d{1,2}) de ${M}${Y}`))
  if (m) {
    const r = range(n(m[4]), MONTHS[m[3]], n(m[1]), n(m[4]), MONTHS[m[3]], n(m[2]))
    if (r) return r
  }

  // "junio 1 al 15 de 2021", "febrero 1 al 28 del 2026", "agosto1 al 15 2024"
  m = t.match(new RegExp(`${M} ?(\\d{1,2}) ${TO} (\\d{1,2})${Y}`))
  if (m) {
    const r = range(n(m[4]), MONTHS[m[1]], n(m[2]), n(m[4]), MONTHS[m[1]], n(m[3]))
    if (r) return r
  }

  // "mayo 15 de 2022", "mayo de 2021", "agosto - 2024": mes completo del año indicado
  m = t.match(new RegExp(`${M}(?: ?\\d{1,2})?${Y}`))
  if (m) return { ...wholeMonth(Number(m[2]), MONTHS[m[1]]), source: 'mes_del_titulo' }

  // "informe mensual marzo", "marzo 22 al 31": mes sin año
  m = t.match(new RegExp(M))
  const reference = /^(\d{4})-(\d{2})/.exec(String(referenceDate ?? ''))
  if (m && reference) {
    const month = MONTHS[m[1]]
    const year = Number(reference[1]) - (month > Number(reference[2]) ? 1 : 0)
    return { ...wholeMonth(year, month), source: 'mes_del_titulo_y_fecha' }
  }

  return null
}

/** Fecha de un campo fecha de Toolset (timestamp Unix a medianoche UTC). */
export function toolsetDate(value) {
  if (!/^\d{9,11}$/.test(String(value ?? '').trim())) return null
  return new Date(Number(value) * 1000).toISOString().slice(0, 10)
}

/** Fecha de WordPress a ISO: usa la columna GMT y, si está vacía, la local de Colombia (UTC-5). */
export function wpDateToIso(gmt, local) {
  const valid = v => v && !String(v).startsWith('0000-00-00')
  if (valid(gmt)) return `${String(gmt).replace(' ', 'T')}Z`
  if (valid(local)) return `${String(local).replace(' ', 'T')}-05:00`
  return null
}

/** true si el HTML no tiene texto ni imágenes, tablas o iframes. */
export function isBlankHtml(html) {
  const value = String(html ?? '')
  if (/<(img|table|iframe|video)\b/i.test(value)) return false
  return htmlToText(value) === ''
}

/** Texto plano de un fragmento HTML. */
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

/** Ruta relativa segura dentro de uploads: sin "..", sin ruta absoluta ni segmentos vacíos. */
export function safeRelPath(rel) {
  const value = String(rel ?? '').trim()
  if (!value || value.startsWith('/') || /[\0\\]/.test(value)) return null
  return value.split('/').some(part => part === '' || part === '.' || part === '..') ? null : value
}

/** Ruta relativa dentro de wp-content/uploads a partir de una URL del sitio anterior. */
export function uploadsPathFromUrl(url) {
  const m = String(url ?? '').trim().match(UPLOADS_URL_PATH)
  if (!m) return null
  let rel = m[1]
  try {
    rel = decodeURIComponent(rel)
  } catch {
    // Se conserva la ruta tal cual si trae una secuencia % inválida.
  }
  return safeRelPath(rel)
}

/**
 * Clave para Supabase Storage conservando la estructura AAAA/MM/archivo.
 * Storage rechaza las claves con tildes y otros caracteres especiales: si un
 * segmento tiene caracteres fuera de [A-Za-z0-9._-] se sustituyen y se agrega
 * un hash corto del nombre original para evitar colisiones.
 */
export function storageKey(relPath) {
  return String(relPath).split('/').filter(Boolean).map(segment => {
    const clean = segment.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-')
    if (clean === segment) return segment
    const hash = createHash('sha1').update(segment).digest('hex').slice(0, 8)
    const dot = clean.lastIndexOf('.')
    return dot > 0 ? `${clean.slice(0, dot)}_${hash}${clean.slice(dot)}` : `${clean}_${hash}`
  }).join('/')
}

/**
 * Descripción de un archivo de documento legal para project_documents.
 * @param {{ title: string, detail?: string, role: string, documentDate?: string | null }} input
 */
export function documentDescription({ title, detail = '', role, documentDate = null }) {
  const note = role === 'adicional'
    ? 'archivo adicional adjunto en la plataforma anterior'
    : (fold(detail).trim() === fold(title).trim() ? '' : detail)
  const date = documentDate ? `fecha del documento: ${documentDate.split('-').reverse().join('/')}` : ''
  return [String(title ?? '').trim(), String(note ?? '').trim(), date].filter(Boolean).join(' — ')
}

/**
 * Reescribe las URLs de wp-content/uploads del HTML hacia el destino nuevo.
 * @param {string} html
 * @param {(key: string) => string} toUrl
 * @returns {{ html: string, paths: string[] }}
 */
export function rewriteUploadsUrls(html, toUrl) {
  const paths = new Set()
  const out = String(html ?? '').replace(UPLOADS_URL, url => {
    const rel = uploadsPathFromUrl(url)
    if (!rel) return url
    paths.add(rel)
    return toUrl(storageKey(rel))
  })
  return { html: out, paths: [...paths] }
}

/**
 * Secciones del informe en orden de impresión, sin las vacías. La galería se
 * representa con una entrada { key, title, gallery: true } en su posición.
 * @param {Record<string, unknown>} fields
 * @param {Record<string, { name?: string }>} labels
 * @param {(key: string) => string} toUrl
 */
export function buildReport(fields, labels, toUrl) {
  const paths = new Set()
  const sections = []
  const gallery = Array.isArray(fields[GALLERY_KEY]) ? fields[GALLERY_KEY] : (fields[GALLERY_KEY] ? [fields[GALLERY_KEY]] : [])
  const photos = []

  for (const url of gallery.map(v => String(v ?? '').trim()).filter(Boolean)) {
    const rel = uploadsPathFromUrl(url)
    if (rel) paths.add(rel)
    photos.push({ url: rel ? toUrl(storageKey(rel)) : url, sort_order: photos.length })
  }

  for (const key of SECTION_ORDER) {
    const title = labels[key]?.name ?? key
    if (key === GALLERY_KEY) {
      if (photos.length) sections.push({ key, title, gallery: true })
      continue
    }
    const value = fields[key]
    if (typeof value !== 'string' || isBlankHtml(value)) continue
    const rewritten = rewriteUploadsUrls(value, toUrl)
    rewritten.paths.forEach(p => paths.add(p))
    sections.push({ key, title, html: rewritten.html })
  }

  const signatures = {}
  for (const [field, name] of Object.entries(SIGNATURE_FIELDS)) signatures[name] = String(fields[field] ?? '') === '1'

  return { sections, photos, signatures, paths: [...paths] }
}

/**
 * Archivos de cada documento legal, con el principal primero.
 * - principal: el archivo del campo doc-adjunto, que es el que muestra WordPress.
 * - adicional: otros archivos subidos al mismo documento.
 * - adjunto: archivos de un documento que no tiene archivo principal.
 * WordPress deja algunos archivos colgados del documento anterior al que
 * pertenecen: si un archivo es el principal de otro documento, no se repite.
 * @param {{ wp_id: number, fields?: Record<string, unknown>, files?: { file: string }[] }[]} documents
 */
export function selectDocumentFiles(documents) {
  const primaryOf = new Map()
  const ownersOf = new Map()
  for (const d of documents) {
    const rel = uploadsPathFromUrl(d.fields?.['doc-adjunto'])
    if (!rel) continue
    primaryOf.set(d.wp_id, rel)
    ownersOf.set(rel, [...(ownersOf.get(rel) ?? []), d.wp_id])
  }
  return documents.map(d => {
    const primary = primaryOf.get(d.wp_id) ?? null
    const files = []
    const skipped = []
    for (const file of d.files ?? []) {
      const rel = safeRelPath(file.file)
      if (!rel) {
        skipped.push({ file: String(file.file), reason: 'ruta_no_valida' })
        continue
      }
      if (rel === primary) {
        if (!files.some(f => f.role === 'principal')) files.unshift({ ...file, rel, role: 'principal' })
        continue
      }
      const owner = (ownersOf.get(rel) ?? []).find(id => id !== d.wp_id)
      if (owner) {
        skipped.push({ file: rel, reason: 'principal_de_otro_documento', owner_wp_id: owner })
        continue
      }
      files.push({ ...file, rel, role: primary ? 'adicional' : 'adjunto' })
    }
    if (primary && !files.some(f => f.role === 'principal')) {
      files.unshift({ file: primary, rel: primary, attachment_wp_id: null, title: null, mime: null, role: 'principal' })
    }
    return { wp_id: d.wp_id, files, skipped }
  })
}

/**
 * Separa los archivos cuyo contenido ya apareció antes en la lista.
 * @template {{ rel: string }} T
 * @param {T[]} files
 * @param {(rel: string) => string | undefined} hashOf hash del contenido, si se conoce
 * @returns {{ kept: T[], duplicates: T[] }}
 */
export function dropDuplicateFiles(files, hashOf) {
  const seen = new Set()
  const kept = []
  const duplicates = []
  for (const file of files) {
    const hash = hashOf(file.rel)
    if (hash && seen.has(hash)) {
      duplicates.push(file)
      continue
    }
    if (hash) seen.add(hash)
    kept.push(file)
  }
  return { kept, duplicates }
}

/** NIT sin dígito de verificación ni separadores. */
export function nitBase(nit) {
  const value = String(nit ?? '').trim()
  return (value.includes('-') ? value.split('-')[0] : value).replace(/\D/g, '')
}

const LEGAL_TOKENS = new Set(['sas', 'sa', 'ltda', 'sociedad', 'limitada', 'en', 'cs', 'sca', 'eu'])

/** Nombre de empresa comparable: sin tildes, puntuación ni sufijos societarios. */
export function normalizeCompanyName(name) {
  return fold(name)
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(t => t && t.length > 1 && !LEGAL_TOKENS.has(t))
    .join(' ')
}

/**
 * Empresa por nombre: coincidencia exacta normalizada o, si no hay, la única
 * cuyo nombre contiene todas las palabras del otro empezando por la misma.
 * @template {{ name: string }} T
 * @param {string} name
 * @param {T[]} candidates
 * @returns {T | null}
 */
export function matchCompanyByName(name, candidates) {
  const target = normalizeCompanyName(name)
  if (!target) return null
  const exact = candidates.filter(c => normalizeCompanyName(c.name) === target)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return null
  const words = target.split(' ')
  const partial = candidates.filter(c => {
    const other = normalizeCompanyName(c.name).split(' ')
    if (!other[0] || other[0] !== words[0]) return false
    const [short, long] = other.length <= words.length ? [other, words] : [words, other]
    return short.every(w => long.includes(w))
  })
  return partial.length === 1 ? partial[0] : null
}

/**
 * Empresa cliente de un proyecto de WordPress, de mayor a menor confianza:
 * la confirmada en mapping.json, la empresa enlazada en WordPress y, por
 * último, la que coincide sin ambigüedad con el campo "gerencia".
 * @param {{ wp_id: number, empresa_wp_id?: number | null, fields?: Record<string, unknown> }} project
 * @param {{
 *   overrides?: Record<string, { company_wp_id: number }>,
 *   companies: { wp_id: number, name: string, supabase_id?: string | null, supabase_name?: string | null }[],
 *   supabaseCompanies: { id: string, name: string }[]
 * }} context
 * @returns {{ via: string, company_wp_id?: number, supabase_id: string | null, name: string } | null}
 */
export function resolveProjectClient(project, { overrides = {}, companies, supabaseCompanies }) {
  const byWpId = new Map(companies.map(c => [c.wp_id, c]))
  const fromWordPress = (company, via) => ({
    via,
    company_wp_id: company.wp_id,
    supabase_id: company.supabase_id ?? null,
    name: company.supabase_name ?? company.name
  })
  const override = overrides[String(project.wp_id)]
  if (override) {
    const company = byWpId.get(override.company_wp_id)
    return company ? fromWordPress(company, 'confirmada en mapping.json') : null
  }
  const linked = byWpId.get(project.empresa_wp_id)
  if (linked) return fromWordPress(linked, 'empresa enlazada en WordPress')
  const gerencia = String(project.fields?.['gerencia-del-proyecto'] ?? '').trim()
  const inSupabase = matchCompanyByName(gerencia, supabaseCompanies)
  if (inSupabase) return { via: `gerencia "${gerencia}"`, supabase_id: inSupabase.id, name: inSupabase.name }
  const inWordPress = matchCompanyByName(gerencia, companies)
  return inWordPress ? fromWordPress(inWordPress, `gerencia "${gerencia}"`) : null
}

/** Municipio mencionado en la dirección, solo si es uno y sin ambigüedad. */
export function extractCity(address, cities) {
  const text = ` ${fold(address).replace(/[^a-z0-9]+/g, ' ')} `
  const found = cities.filter(city => text.includes(` ${fold(city).replace(/[^a-z0-9]+/g, ' ').trim()} `))
  return found.length === 1 ? found[0] : ''
}
