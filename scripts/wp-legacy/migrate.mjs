#!/usr/bin/env node
/**
 * Importador del archivo histórico de la plataforma anterior (WordPress).
 *
 * Uso:
 *   node scripts/wp-legacy/migrate.mjs export [--since "AAAA-MM-DD HH:MM:SS"]
 *     Lee WordPress por SSH con WP-CLI (solo SELECT) y guarda export.jsonl.
 *     Con --since (GMT) solo trae informes y documentos modificados después.
 *   node scripts/wp-legacy/migrate.mjs plan [--offline]
 *     Dry-run: cruza el export con Supabase (solo lectura), consulta en el
 *     servidor qué archivos existen y cuánto pesan, y escribe plan.json,
 *     plan-reports.jsonl y plan-files.tsv. No escribe en Supabase ni en WordPress.
 *     Con --offline no usa SSH: toma tamaños y md5 de remote-cache.json.
 *   node scripts/wp-legacy/migrate.mjs apply [--projects 55603,115] [--write]
 *     Ejecuta el plan: empresas, proyectos, archivos, informes y documentos.
 *     Sin --write solo muestra lo que haría. Con --projects se limita a esos
 *     proyectos de WordPress (piloto). Se puede repetir: no duplica nada.
 *     Los archivos se descargan del sitio por HTTPS.
 *
 * Requisitos:
 *   - export y plan sin --offline: acceso SSH sin contraseña al servidor (llave
 *     o conexión maestra abierta): WP_SSH_TARGET (por defecto "ti-wp") y,
 *     opcional, WP_SSH_CONFIG.
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *   - WP_LEGACY_DIR: carpeta de trabajo fuera del repo (por defecto
 *     ../ti-wp-migration-data). Contiene datos personales: no versionarla.
 *   - Documentos de más de 50 MB (límite de Storage): versión comprimida en
 *     compressed/<doc_id>.pdf dentro de esa carpeta. Los dos actuales se
 *     prepararon con PyMuPDF (imágenes a 150 dpi, JPEG calidad 70).
 *   - mapping.json en esa carpeta, con las decisiones tomadas a mano:
 *       projects:        { "<id WP>": { "supabase_id": "<uuid del proyecto existente>" } }
 *       project_clients: { "<id WP del proyecto>": { "company_wp_id": <id WP de la empresa> } }
 *       skip_reports:    { "<id WP del informe>": "<motivo>" }
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  buildReport,
  classifyReport,
  documentDescription,
  dropDuplicateFiles,
  extractCity,
  htmlToText,
  nitBase,
  normalizeCompanyName,
  parsePeriod,
  parseReportNumber,
  resolveProjectClient,
  selectDocumentFiles,
  stableUuid,
  storageKey,
  toolsetDate,
  uploadsPathFromUrl,
  wpDateToIso
} from './lib/transform.mjs'
import { LEGACY_DOCUMENTS_BUCKET, legacyDocumentObjectPath, legacyDocumentUrl } from '../../lib/legacy-wp/document-path.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
dotenv.config({ path: path.join(root, '.env.local'), quiet: true })

const WORK_DIR = path.resolve(process.env.WP_LEGACY_DIR || path.join(root, '..', 'ti-wp-migration-data'))
const EXPORT_FILE = path.join(WORK_DIR, 'export.jsonl')
const MAPPING_FILE = path.join(WORK_DIR, 'mapping.json')
const CACHE_FILE = path.join(WORK_DIR, 'remote-cache.json')
const MEDIA_MANIFEST = path.join(WORK_DIR, 'uploaded-media.txt')
const WP_UPLOADS_URL = process.env.WP_UPLOADS_URL || 'https://app.talentoinmobiliario.com/wp-content/uploads'
const SSH_ARGS = [
  ...(process.env.WP_SSH_CONFIG ? ['-F', process.env.WP_SSH_CONFIG] : []),
  '-C', '-o', 'BatchMode=yes', process.env.WP_SSH_TARGET || 'ti-wp'
]
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const MEDIA_BUCKET = 'legacy-wp-media'
const DOCS_BUCKET = LEGACY_DOCUMENTS_BUCKET
const MAX_FILE_BYTES = 50 * 1024 * 1024

// Municipios que aparecen en las direcciones de los proyectos.
const CITIES = [
  'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella', 'Caldas', 'Copacabana',
  'Girardota', 'Barbosa', 'Rionegro', 'Guarne', 'Marinilla', 'El Retiro', 'La Ceja',
  'El Carmen de Viboral', 'El Santuario', 'San Pedro de los Milagros', 'Santa Fe de Antioquia',
  'Barranquilla', 'Puerto Colombia', 'Soledad', 'Cartago', 'Bogotá', 'Cali', 'Cartagena',
  'Santa Marta', 'Montería', 'Pereira', 'Manizales', 'Armenia'
]

const str = value => (value == null ? '' : String(value)).trim()
const gb = bytes => `${(bytes / 1024 ** 3).toFixed(2)} GB`

function ensureWorkDir() {
  fs.mkdirSync(WORK_DIR, { recursive: true, mode: 0o700 })
  fs.chmodSync(WORK_DIR, 0o700)
}

function ssh(remoteCommand, { input = '', stdoutFile, okCodes = [0] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', [...SSH_ARGS, remoteCommand])
    const chunks = []
    let stderr = ''
    const out = stdoutFile ? fs.createWriteStream(stdoutFile, { mode: 0o600 }) : null
    const written = out ? new Promise(done => out.on('finish', done)) : Promise.resolve()
    if (out) child.stdout.pipe(out)
    else child.stdout.on('data', chunk => chunks.push(chunk))
    child.stderr.on('data', chunk => { stderr += chunk })
    // Si ssh termina antes de leer toda la entrada, el error útil llega en 'close'.
    child.stdin.on('error', () => {})
    child.on('error', reject)
    child.on('close', async code => {
      await written
      if (!okCodes.includes(code)) {
        reject(new Error(`ssh terminó con código ${code}: ${stderr.trim().slice(0, 2000)}`))
        return
      }
      resolve({ stdout: Buffer.concat(chunks).toString('utf8'), stderr })
    })
    child.stdin.end(input)
  })
}

async function loadExport(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`No existe ${file}. Ejecuta primero: node scripts/wp-legacy/migrate.mjs export`)
  }
  const data = {
    fieldDefs: { post: {}, user: {} }, companies: [], residents: [], users: [], projects: [],
    reports: [], documents: [], reportIds: [], documentIds: [], meta: null, invalid: []
  }
  const lists = { company: 'companies', resident: 'residents', user: 'users', project: 'projects', report: 'reports', document: 'documents' }
  const lines = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity })
  for await (const line of lines) {
    if (!line.trim()) continue
    let record
    try {
      record = JSON.parse(line)
    } catch {
      data.invalid.push(line.slice(0, 300))
      continue
    }
    if (lists[record.type]) data[lists[record.type]].push(record)
    else if (record.type === 'field_defs') data.fieldDefs = record
    else if (record.type === 'report_ids') data.reportIds = record.ids
    else if (record.type === 'document_ids') data.documentIds = record.ids
    else if (record.type === 'meta') data.meta = record
  }
  if (!data.meta) throw new Error(`El export ${file} está incompleto (falta el registro meta)`)
  return data
}

function supabaseAdmin() {
  if (!SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  }
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

async function fetchAll(sb, table, columns, orderBy = []) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    let query = sb.from(table).select(columns)
    for (const column of orderBy) query = query.order(column)
    const { data, error } = await query.range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

// Con HEAD, supabase-js responde 204 sin error aunque la tabla no exista: se usa GET.
async function countRows(sb, table) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact' }).limit(1)
  if (error?.code === 'PGRST205') return null
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

async function legacyState(sb) {
  const reports = await countRows(sb, 'legacy_wp_reports')
  if (reports === null) return { migration_106: false }
  return { migration_106: true, reports, map_rows: await countRows(sb, 'legacy_wp_id_map') }
}

/** Tamaño de cada archivo en wp-content/uploads del servidor (solo lectura). */
async function statRemote(relPaths) {
  const sizes = new Map()
  for (let i = 0; i < relPaths.length; i += 20000) {
    const { stdout } = await ssh("cd ~/public/wp-content/uploads && xargs -0 -r stat -c '%s %n' --", {
      input: relPaths.slice(i, i + 20000).join('\0'),
      okCodes: [0, 123]
    })
    for (const line of stdout.split('\n')) {
      const m = line.match(/^(\d+) (.+)$/)
      if (m) sizes.set(m[2], Number(m[1]))
    }
  }
  return sizes
}

/** md5 de archivos de wp-content/uploads calculado en el servidor (solo lectura). */
async function hashRemote(relPaths) {
  const hashes = new Map()
  if (!relPaths.length) return hashes
  const { stdout } = await ssh('cd ~/public/wp-content/uploads && xargs -0 -r md5sum --', {
    input: relPaths.join('\0'),
    okCodes: [0, 123]
  })
  for (const line of stdout.split('\n')) {
    const m = line.match(/^([0-9a-f]{32}) [ *](.+)$/)
    if (m) hashes.set(m[2], m[1])
  }
  return hashes
}

const sha256 = value => createHash('sha256').update(value).digest('hex')
const md5 = value => createHash('md5').update(value).digest('hex')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const valueOf = (args, flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null)

function loadMapping() {
  if (!fs.existsSync(MAPPING_FILE)) throw new Error(`No existe ${MAPPING_FILE} (ver el formato en la cabecera de este script)`)
  const text = fs.readFileSync(MAPPING_FILE, 'utf8')
  return { mapping: JSON.parse(text), mappingSha: sha256(text) }
}

/** Tamaños y md5 ya consultados en el servidor, para planificar sin SSH. */
function loadCache() {
  const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}
  return { sizes: cache.sizes ?? {}, md5: cache.md5 ?? {}, missing: cache.missing ?? [] }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ ...cache, missing: [...new Set(cache.missing)], updated_at: new Date().toISOString() }), { mode: 0o600 })
}

/**
 * Descarga un archivo de wp-content/uploads por HTTPS, con reintentos.
 * Devuelve null si el archivo no existe en el sitio.
 */
async function downloadFromWordPress(rel, attempts = 4) {
  const url = `${WP_UPLOADS_URL}/${rel.split('/').map(encodeURIComponent).join('/')}`
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const contentType = res.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream'
      // Una página HTML en lugar del archivo (por ejemplo, un inicio de sesión) no es el archivo.
      if (contentType === 'text/html' && !/\.html?$/i.test(rel)) return null
      const buffer = Buffer.from(await res.arrayBuffer())
      const expected = Number(res.headers.get('content-length'))
      if (!res.headers.get('content-encoding') && expected > 0 && expected !== buffer.length) throw new Error('descarga incompleta')
      return { buffer, contentType }
    } catch (error) {
      if (attempt >= attempts) throw new Error(`${rel}: ${error.message}`)
      await sleep(1000 * 2 ** (attempt - 1))
    }
  }
}

/** Sube un archivo a Storage. Si ya existe con esa clave, no lo reemplaza. */
async function uploadObject(sb, bucket, key, file, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    const { error } = await sb.storage.from(bucket).upload(key, file.buffer, {
      contentType: file.contentType,
      cacheControl: '31536000',
      upsert: false
    })
    if (!error || /exists|duplicate/i.test(error.message)) return
    const status = Number(error.statusCode ?? error.status)
    const retryable = !status || status === 429 || status >= 500
    if (!retryable || attempt >= attempts) throw new Error(`${bucket}/${key}: ${error.message}`)
    await sleep(1000 * 2 ** (attempt - 1))
  }
}

/** Ejecuta worker sobre items con un máximo de tareas simultáneas. */
async function pool(items, size, worker) {
  let next = 0
  const run = async () => {
    while (next < items.length) {
      const index = next++
      await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run))
}

async function cmdExport(args) {
  const i = args.indexOf('--since')
  const since = i >= 0 ? args[i + 1] : null
  if (since !== null && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(since ?? '')) {
    throw new Error('--since debe tener el formato "AAAA-MM-DD HH:MM:SS" (GMT)')
  }
  ensureWorkDir()
  const code = fs.readFileSync(path.join(here, 'export.php'), 'utf8').replace(/^<\?php\s*/, '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '')
  const file = path.join(WORK_DIR, `${since ? 'export-incremental' : 'export'}-${stamp}.jsonl`)
  console.log(`Exportando WordPress en modo solo lectura${since ? ` (cambios desde ${since} GMT)` : ''}...`)
  const { stderr } = await ssh(`cd ~/public && ${since ? `TI_SINCE='${since}' ` : ''}wp eval "$(cat)" --skip-plugins --skip-themes`, {
    input: code,
    stdoutFile: file
  })
  const data = await loadExport(file)
  if (!since) fs.copyFileSync(file, EXPORT_FILE)
  console.log(`Archivo: ${file} (${(fs.statSync(file).size / 1024 ** 2).toFixed(1)} MB)`)
  console.log('Registros:', JSON.stringify(data.meta.counts))
  if (data.invalid.length) console.log(`Líneas no válidas: ${data.invalid.length}. Primera: ${data.invalid[0]}`)
  if (stderr.trim()) console.log(`Avisos de WP-CLI: ${stderr.trim().slice(0, 500)}`)
}

async function cmdPlan(args = []) {
  ensureWorkDir()
  const offline = args.includes('--offline')
  const cache = loadCache()
  const data = await loadExport(EXPORT_FILE)
  const { mapping, mappingSha } = loadMapping()
  const sb = supabaseAdmin()
  const [sbProjects, sbCompanies, sbProfiles, state] = await Promise.all([
    fetchAll(sb, 'projects', 'id,name,status,is_archived,client_company_id'),
    fetchAll(sb, 'companies', 'id,name,nit,logo_url'),
    fetchAll(sb, 'profiles', 'id,email,full_name,role,phone,signature_url,avatar_url,professional_license'),
    legacyState(sb)
  ])
  const warnings = []
  const mediaUrl = key => `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${key}`
  const importer = sbProfiles.find(p => p.role === 'super_admin')
  if (!importer) warnings.push('No hay perfil super_admin para registrar como creador de proyectos y documentos importados')

  // Empresas: se enlazan por NIT con Supabase o se crean
  const companies = data.companies.filter(c => c.kind === 'empresa').map(c => {
    const f = c.fields
    const name = str(f['razon-social-de-la-empresa']) || str(c.title)
    const nit = str(f['nit-de-la-empresa'])
    const byNit = nitBase(nit) ? sbCompanies.find(s => nitBase(s.nit) === nitBase(nit)) : null
    const byName = byNit ? null : sbCompanies.find(s => normalizeCompanyName(s.name) === normalizeCompanyName(name))
    if (byName) warnings.push(`Empresa WP "${name}" (NIT ${nit}) coincide por nombre con "${byName.name}" (NIT ${byName.nit}): se enlaza sin crear duplicado`)
    const existing = byNit ?? byName
    return {
      wp_id: c.wp_id,
      name,
      nit,
      action: existing ? 'enlazar' : 'crear',
      matched_by: byNit ? 'nit' : (byName ? 'nombre' : null),
      supabase_id: existing?.id ?? null,
      supabase_name: existing?.name ?? null,
      insert: existing ? null : {
        name, nit, address: str(f['direccion-de-la-empresa']) || null, phone: str(f['telefono-de-la-empresa']) || null,
        company_type: 'cliente', is_active: true, created_by: importer?.id ?? null
      },
      target_id: existing?.id ?? stableUuid('empresa', c.wp_id),
      logo_path: existing ? null : uploadsPathFromUrl(f['logotipo-de-la-empresa'])
    }
  })
  const skippedCompanies = data.companies.filter(c => c.kind !== 'empresa')
    .map(c => ({ wp_id: c.wp_id, kind: c.kind, name: str(c.fields['nombre-de-inmobiliaria']) || str(c.title) }))
  const resolveClient = project => resolveProjectClient(project, {
    overrides: mapping.project_clients,
    companies,
    supabaseCompanies: sbCompanies
  })

  // Proyectos: los del mapping se enlazan; el resto se crea finalizado y archivado
  const sbProjectById = new Map(sbProjects.map(p => [p.id, p]))
  const projects = data.projects.map(p => {
    const f = p.fields
    const pair = mapping.projects[String(p.wp_id)]
    if (pair) {
      const target = sbProjectById.get(pair.supabase_id)
      if (!target) warnings.push(`Proyecto WP #${p.wp_id} (${p.title}) apunta a ${pair.supabase_id}, que no existe en Supabase`)
      return { wp_id: p.wp_id, title: p.title, action: 'enlazar', supabase_id: pair.supabase_id, target_id: pair.supabase_id, supabase_name: target?.name ?? null, confirmed: pair.confirmed !== false }
    }
    const client = resolveClient(p)
    if (!client) warnings.push(`Proyecto WP #${p.wp_id} (${p.title}): sin empresa cliente (gerencia "${str(f['gerencia-del-proyecto'])}", constructor "${str(Object.hasOwn(f, 'constructor') ? f.constructor : '')}")`)
    const address = str(f['direccion-del-proyecto'])
    return {
      wp_id: p.wp_id,
      title: p.title,
      action: 'crear_archivado',
      target_id: stableUuid('proyecto', p.wp_id),
      wp_modified_at: wpDateToIso(p.modified_gmt, p.modified),
      client,
      client_company_id: client?.supabase_id ?? (client?.company_wp_id ? stableUuid('empresa', client.company_wp_id) : null),
      insert: {
        name: str(f['nombre-del-proyecto']) || str(p.title),
        address,
        // projects.city no admite nulos: vacío cuando la dirección no lo dice
        city: extractCity(address, CITIES) ?? '',
        start_date: toolsetDate(f['fecha-inicio-del-proyecto']),
        description: htmlToText(f['descripcion-del-proyecto']) || null,
        status: 'finalizado',
        progress_percentage: 100,
        is_archived: true,
        auto_generate_reports: false,
        intervention_types: [],
        project_code: `HIST-${p.wp_id}`,
        created_by: importer?.id ?? null
      },
      image_path: uploadsPathFromUrl(f['imagen-del-proyecto'])
    }
  })
  const projectByWp = new Map(projects.map(p => [p.wp_id, p]))
  const projectRef = p => p.target_id

  // Autores: usuario de WordPress -> perfil de Supabase por correo
  const profileByEmail = new Map(sbProfiles.filter(p => p.email).map(p => [p.email.toLowerCase().trim(), p]))
  const userByWp = new Map(data.users.map(u => [u.wp_id, u]))
  const authorOf = wpUserId => {
    const user = userByWp.get(wpUserId)
    return {
      author_wp_user_id: wpUserId || null,
      author_name: user ? (str(`${user.first_name} ${user.last_name}`) || str(user.display_name) || null) : null,
      author_profile_id: (user && profileByEmail.get(user.email)?.id) ?? null
    }
  }

  // Informes
  const media = new Map()
  const addMedia = rel => rel && media.set(rel, (media.get(rel) ?? 0) + 1)
  const mediaPrefix = mediaUrl('')
  const stats = { total: 0, byKind: {}, byPeriodSource: {}, withoutPeriod: 0, withAuthorProfile: 0, sections: 0, photos: 0, externalImages: {}, perProject: {} }
  const addExternalImage = src => {
    if (src.startsWith(mediaPrefix)) return
    const host = /^(?:https?:)?\/\/([^/]+)/i.exec(src)?.[1] ?? (src.startsWith('data:') ? 'embebida' : 'ruta relativa')
    stats.externalImages[host] = (stats.externalImages[host] ?? 0) + 1
  }
  const withoutPeriodSamples = []
  const reportsOut = fs.createWriteStream(path.join(WORK_DIR, 'plan-reports.jsonl'), { mode: 0o600 })
  const skippedReports = []
  for (const r of data.reports) {
    const skipReason = mapping.skip_reports?.[String(r.wp_id)]
    if (skipReason) {
      skippedReports.push(`#${r.wp_id}: ${skipReason}`)
      continue
    }
    const project = projectByWp.get(r.project_wp_id)
    if (!project) {
      warnings.push(`Informe WP #${r.wp_id} sin proyecto asociado`)
      continue
    }
    const f = r.fields
    const shortTitle = str(f['nombre-del-informe-corto-y-fecha'])
    const longTitle = str(f['nombre-del-informe-largo-con-fecha'])
    const notifiedOn = toolsetDate(f['fecha-notificacion-residente'])
    // Para títulos con mes sin año: la notificación ocurre días después del
    // período; la fecha de creación no sirve porque hay informes duplicados
    // que conservan la fecha del original.
    const referenceDate = notifiedOn ?? wpDateToIso(r.modified_gmt, r.modified)
    const built = buildReport(f, data.fieldDefs.post, mediaUrl)
    const period = parsePeriod(shortTitle, referenceDate) ?? parsePeriod(longTitle, referenceDate)
    const kind = classifyReport(shortTitle)
    const row = {
      wp_post_id: r.wp_id,
      wp_project_id: r.project_wp_id,
      project_id: projectRef(project),
      report_kind: kind === 'otro' ? classifyReport(longTitle) : kind,
      report_number: parseReportNumber(shortTitle) ?? parseReportNumber(longTitle),
      title: str(r.title) || shortTitle || `Informe ${r.wp_id}`,
      short_title: shortTitle || null,
      long_title: longTitle || null,
      period_start: period?.start ?? null,
      period_end: period?.end ?? null,
      period_source: period?.source ?? null,
      notified_on: notifiedOn,
      sections: built.sections,
      photos_title: str(f['titulo-registro-fotografico']) || null,
      photos: built.photos,
      signatures: built.signatures,
      director_de_obra: str(f['director-de-obra']) || null,
      director_de_obra_matricula: str(f['director-de-obra-matricula']) || null,
      ...authorOf(r.author_wp_id),
      wp_created_at: wpDateToIso(r.date_gmt, r.date),
      wp_modified_at: wpDateToIso(r.modified_gmt, r.modified)
    }
    if (!row.wp_created_at || !row.wp_modified_at) warnings.push(`Informe WP #${r.wp_id}: sin fecha de creación o de modificación válida`)
    // _media no es una columna: son los archivos que el informe necesita en Storage.
    reportsOut.write(`${JSON.stringify({ ...row, _media: built.paths })}\n`)
    built.paths.forEach(addMedia)
    built.photos.forEach(photo => addExternalImage(photo.url))
    for (const section of built.sections) {
      for (const m of (section.html ?? '').matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']?([^"'\s>]+)/gi)) addExternalImage(m[1])
    }

    stats.total++
    stats.byKind[row.report_kind] = (stats.byKind[row.report_kind] ?? 0) + 1
    if (period) stats.byPeriodSource[period.source] = (stats.byPeriodSource[period.source] ?? 0) + 1
    else {
      stats.withoutPeriod++
      withoutPeriodSamples.push(`#${r.wp_id} ${shortTitle || '(sin título corto)'} | largo: ${longTitle || '—'}`)
    }
    if (row.author_profile_id) stats.withAuthorProfile++
    stats.sections += built.sections.filter(s => !s.gallery).length
    stats.photos += built.photos.length
    const per = stats.perProject[project.wp_id] ??= { title: project.title, reports: 0, from: row.wp_created_at, to: row.wp_created_at }
    per.reports++
    if (row.wp_created_at < per.from) per.from = row.wp_created_at
    if (row.wp_created_at > per.to) per.to = row.wp_created_at
  }
  await new Promise(done => reportsOut.end(done))
  projects.filter(p => p.action === 'crear_archivado').forEach(p => {
    addMedia(p.image_path)
    // Última actividad del proyecto archivado: su último informe en WordPress
    p.insert.last_activity_at = stats.perProject[p.wp_id]?.to ?? p.wp_modified_at
  })

  // Documentos legales: una fila de project_documents por archivo. El principal
  // es el del campo doc-adjunto; los demás archivos subidos al documento se
  // importan como adicionales, sin las copias exactas (mismo md5).
  const selections = new Map(selectDocumentFiles(data.documents).map(s => [s.wp_id, s]))
  const candidateRels = [...new Set([...selections.values()].flatMap(s => s.files.map(file => file.rel)))]
  let hashes
  if (offline) {
    hashes = new Map(candidateRels.filter(rel => cache.md5[rel]).map(rel => [rel, cache.md5[rel]]))
    const pending = candidateRels.filter(rel => !hashes.has(rel) && !cache.missing.includes(rel))
    if (pending.length) console.log(`Calculando por HTTPS el md5 de ${pending.length} archivos de documentos que no estaban en caché...`)
    for (const rel of pending) {
      const file = await downloadFromWordPress(rel)
      if (!file) {
        cache.missing.push(rel)
        continue
      }
      hashes.set(rel, md5(file.buffer))
      cache.md5[rel] = hashes.get(rel)
      cache.sizes[rel] = file.buffer.length
    }
  } else {
    console.log(`Calculando en el servidor el md5 de ${candidateRels.length} archivos de documentos (solo lectura)...`)
    hashes = await hashRemote(candidateRels)
    hashes.forEach((hash, rel) => { cache.md5[rel] = hash })
  }
  const documents = []
  const documentNotes = []
  const documentKeys = new Set()
  for (const d of data.documents) {
    const project = projectByWp.get(d.project_wp_id)
    if (!project) {
      warnings.push(`Documento WP #${d.wp_id} (${d.title}) sin proyecto asociado`)
      continue
    }
    const selection = selections.get(d.wp_id)
    const { kept, duplicates } = dropDuplicateFiles(selection.files, rel => hashes.get(rel))
    if (!kept.length) warnings.push(`Documento WP #${d.wp_id} (${d.title}) sin archivo adjunto`)
    for (const skipped of selection.skipped) {
      if (skipped.reason === 'ruta_no_valida') warnings.push(`Documento WP #${d.wp_id}: ruta de archivo no válida (${skipped.file})`)
      else documentNotes.push(`#${d.wp_id} "${d.title}": ${path.posix.basename(skipped.file)} es el archivo del documento #${skipped.owner_wp_id}; no se repite`)
    }
    duplicates.forEach(file => documentNotes.push(`#${d.wp_id} "${d.title}": ${path.posix.basename(file.rel)} es copia exacta de otro archivo del mismo documento; se omite`))
    const f = d.fields
    const author = authorOf(d.author_wp_id)
    const documentDate = toolsetDate(f['fecha-del-documento-legal'])
    const detail = htmlToText(f['descripcion-del-documento-legal'])
    for (const file of kept) {
      // Clave del mapa: el ID del adjunto; si no tiene o ya está usado, el ID
      // del documento (posts y adjuntos comparten secuencia en WordPress).
      const mapWpId = [file.attachment_wp_id, d.wp_id].find(id => id && !documentKeys.has(id))
      if (!mapWpId) {
        warnings.push(`Documento WP #${d.wp_id}: el archivo ${file.rel} no tiene identificador libre en el mapa; se omite`)
        continue
      }
      documentKeys.add(mapWpId)
      const fileName = path.posix.basename(file.rel)
      const description = documentDescription({ title: str(d.title), detail, role: file.role, documentDate })
      documents.push({
        map_wp_id: mapWpId,
        doc_id: stableUuid('documento', mapWpId),
        document_wp_id: d.wp_id,
        project_wp_id: d.project_wp_id,
        role: file.role,
        project_id: projectRef(project),
        rel: file.rel,
        md5: hashes.get(file.rel) ?? null,
        details: {
          document_wp_id: d.wp_id,
          role: file.role,
          document_date: documentDate,
          author_wp_user_id: author.author_wp_user_id,
          author_name: author.author_name
        },
        insert: {
          file_name: fileName,
          file_type: 'other',
          mime_type: file.mime || null,
          uploaded_by: author.author_profile_id ?? importer?.id ?? null,
          uploaded_at: wpDateToIso(d.date_gmt, d.date),
          description: description || null,
          is_public: false
        }
      })
    }
  }

  // Perfiles: completar firma, foto, matrícula y teléfono solo donde están vacíos
  const residentByWp = new Map(data.residents.map(r => [r.wp_id, r]))
  const profiles = []
  for (const user of data.users) {
    const profile = profileByEmail.get(user.email)
    if (!profile) continue
    const resident = residentByWp.get(Number(user.fields['residente-id']))
      ?? data.residents.find(r => str(r.fields['correo-del-residente']).toLowerCase() === user.email)
    const rf = resident?.fields ?? {}
    const candidates = {
      signature_url: uploadsPathFromUrl(user.fields['firma-digital']) ?? uploadsPathFromUrl(rf['firma-digital-residente']),
      avatar_url: uploadsPathFromUrl(user.fields['foto-de-perfil']) ?? uploadsPathFromUrl(rf['foto-de-perfil-del-residente']),
      professional_license: str(user.fields['tarjeta-profesional']) || str(rf['matricula-profesional']) || str(rf['numero-de-tarjeta-profesional']) || null,
      phone: str(user.fields['contacto-adicional']) || str(rf['telefono-del-residente']) || null
    }
    const fill = Object.fromEntries(Object.entries(candidates).filter(([field, value]) => value && !str(profile[field])))
    if (Object.keys(fill).length) profiles.push({ wp_user_id: user.wp_id, profile_id: profile.id, name: profile.full_name, fill })
  }

  // Archivos: tamaño real en el servidor
  const groups = {
    [MEDIA_BUCKET]: [...media.keys()],
    [DOCS_BUCKET]: documents.map(d => d.rel),
    'signatures/avatars': profiles.flatMap(p => [p.fill.signature_url, p.fill.avatar_url].filter(Boolean)),
    'logos de empresas': companies.map(c => c.logo_path).filter(Boolean)
  }
  const allRels = [...new Set(Object.values(groups).flat())]
  let sizes
  if (offline) {
    sizes = new Map(allRels.filter(rel => cache.sizes[rel] !== undefined).map(rel => [rel, cache.sizes[rel]]))
    const known = new Set(cache.missing)
    const unknown = allRels.filter(rel => !sizes.has(rel) && !known.has(rel))
    console.log(`Sin SSH: tamaños tomados de la caché${unknown.length ? ` (${unknown.length} archivos sin dato; se sabrá al copiarlos)` : ''}.`)
  } else {
    console.log(`Consultando en el servidor el tamaño de ${allRels.length} archivos (solo lectura)...`)
    sizes = await statRemote(allRels)
    sizes.forEach((bytes, rel) => { cache.sizes[rel] = bytes })
    cache.missing = [...cache.missing.filter(rel => !sizes.has(rel)), ...allRels.filter(rel => !sizes.has(rel))]
  }
  saveCache(cache)
  const files = Object.fromEntries(Object.entries(groups).map(([group, rels]) => {
    const unique = [...new Set(rels)]
    const found = unique.filter(r => sizes.has(r))
    return [group, {
      files: unique.length,
      found: found.length,
      missing: unique.length - found.length,
      bytes: found.reduce((sum, r) => sum + sizes.get(r), 0),
      over_50mb: found.filter(r => sizes.get(r) > MAX_FILE_BYTES).map(r => ({ rel: r, mb: +(sizes.get(r) / 1024 ** 2).toFixed(1) }))
    }]
  }))
  const missing = allRels.filter(r => !sizes.has(r))
  fs.writeFileSync(path.join(WORK_DIR, 'plan-files.tsv'), allRels.map(r => `${sizes.get(r) ?? 'NO_EXISTE'}\t${r}`).join('\n'), { mode: 0o600 })

  const plan = {
    generated_at: new Date().toISOString(),
    mapping_sha: mappingSha,
    export: { exported_at_gmt: data.meta.exported_at_gmt, since: data.meta.since, counts: data.meta.counts, invalid_lines: data.invalid.length },
    supabase: state,
    projects,
    companies,
    skipped_companies: skippedCompanies,
    reports: { ...stats, skipped: skippedReports, without_period_samples: withoutPeriodSamples },
    documents,
    document_notes: documentNotes,
    profiles,
    files,
    missing_files_sample: missing.slice(0, 50),
    warnings
  }
  fs.writeFileSync(path.join(WORK_DIR, 'plan.json'), JSON.stringify(plan, null, 2), { mode: 0o600 })

  // Resumen
  const linked = projects.filter(p => p.action === 'enlazar')
  const created = projects.filter(p => p.action === 'crear_archivado')
  const totalBytes = Object.values(files).reduce((total, g) => total + g.bytes, 0)
  console.log('\n== Plan de migración (dry-run: no se escribió nada) ==')
  console.log(`Export: ${data.meta.exported_at_gmt} GMT | migración 106 en Supabase: ${state.migration_106 ? `aplicada (${state.reports} informes ya importados)` : 'no aplicada'}`)
  console.log(`\nProyectos: ${projects.length} → ${linked.length} se enlazan, ${created.length} se crean finalizados y archivados`)
  linked.filter(p => !p.confirmed).forEach(p => console.log(`  Por confirmar: WP "${p.title}" → Supabase "${p.supabase_name}"`))
  created.filter(p => !p.client).forEach(p => console.log(`  Sin empresa cliente: WP #${p.wp_id} ${p.title}`))
  console.log(`  Con municipio deducido de la dirección: ${created.filter(p => p.insert.city).length} de ${created.length}`)
  const byMatch = kind => companies.filter(c => c.matched_by === kind).length
  console.log(`\nEmpresas de WordPress: ${companies.length} → ${byMatch('nit') + byMatch('nombre')} ya existen (${byMatch('nit')} por NIT, ${byMatch('nombre')} por nombre), ${companies.filter(c => c.action === 'crear').length} se crean`)
  skippedCompanies.forEach(c => console.log(`  Se omite (${c.kind}): ${c.name}`))
  console.log(`\nInformes: ${stats.total} → ${Object.entries(stats.byKind).map(([k, v]) => `${k}: ${v}`).join(', ')}`)
  skippedReports.forEach(s => console.log(`  Se excluye ${s}`))
  console.log(`  Período: ${Object.entries(stats.byPeriodSource).map(([k, v]) => `${k}: ${v}`).join(', ')}, sin período: ${stats.withoutPeriod}`)
  console.log(`  Autor con cuenta en Supabase: ${stats.withAuthorProfile} de ${stats.total}`)
  console.log(`  Secciones con contenido: ${stats.sections} | fotos de galería: ${stats.photos}`)
  const external = Object.entries(stats.externalImages)
  if (external.length) console.log(`  Imágenes que no se copian porque están en otros sitios: ${external.map(([host, n]) => `${host}: ${n}`).join(', ')}`)
  const byRole = role => documents.filter(d => d.role === role).length
  console.log(`\nDocumentos legales: ${new Set(documents.map(d => d.document_wp_id)).size} documentos → ${documents.length} archivos (${byRole('principal')} principales, ${byRole('adicional')} adicionales, ${byRole('adjunto')} de documentos sin archivo principal)`)
  if (documentNotes.length) console.log(`  No se repiten ${documentNotes.length} archivos: copias exactas o archivos que pertenecen a otro documento (detalle en plan.json)`)
  console.log(`\nPerfiles a completar (solo campos vacíos): ${profiles.length} → firma ${profiles.filter(p => p.fill.signature_url).length}, foto ${profiles.filter(p => p.fill.avatar_url).length}, matrícula ${profiles.filter(p => p.fill.professional_license).length}, teléfono ${profiles.filter(p => p.fill.phone).length}`)
  console.log(`\nArchivos a copiar: ${allRels.length - missing.length} (${gb(totalBytes)}) | no existen en el servidor: ${missing.length}`)
  Object.entries(files).forEach(([group, g]) => console.log(`  ${group}: ${g.found} archivos, ${gb(g.bytes)}${g.missing ? `, faltan ${g.missing}` : ''}${g.over_50mb.length ? `, ${g.over_50mb.length} de más de 50 MB` : ''}`))
  console.log(`\nAdvertencias: ${warnings.length}${warnings.length ? ` (detalle en ${path.join(WORK_DIR, 'plan.json')})` : ''}`)
  warnings.slice(0, 10).forEach(w => console.log(`  - ${w}`))
  console.log(`\nArchivos generados en ${WORK_DIR}: plan.json, plan-reports.jsonl, plan-files.tsv`)
}

async function cmdApply(args) {
  ensureWorkDir()
  const write = args.includes('--write')
  const only = valueOf(args, '--projects')?.split(',').map(Number).filter(Boolean) ?? null
  const planFile = path.join(WORK_DIR, 'plan.json')
  if (!fs.existsSync(planFile)) throw new Error('No existe plan.json. Ejecuta primero el comando plan')
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'))
  if (plan.mapping_sha !== loadMapping().mappingSha) throw new Error('mapping.json cambió después de generar el plan. Ejecuta de nuevo el comando plan')
  const sb = supabaseAdmin()
  if (!(await legacyState(sb)).migration_106) throw new Error('La migración 106 no está aplicada en Supabase')

  // Alcance: todo el plan o solo los proyectos de WordPress indicados
  const unknown = (only ?? []).filter(id => !plan.projects.some(p => p.wp_id === id))
  if (unknown.length) throw new Error(`Proyectos de WordPress que no están en el plan: ${unknown.join(', ')}`)
  const inScope = wpProjectId => !only || only.includes(wpProjectId)
  const projects = plan.projects.filter(p => inScope(p.wp_id))
  const newProjects = projects.filter(p => p.action === 'crear_archivado')
  const blocked = newProjects.filter(p => !p.client_company_id || !p.insert.created_by)
  if (blocked.length) throw new Error(`Proyectos sin empresa cliente o sin creador: ${blocked.map(p => `#${p.wp_id} ${p.title}`).join(', ')}`)
  const companyByWp = new Map(plan.companies.map(c => [c.wp_id, c]))
  const companies = only
    ? [...new Set(newProjects.map(p => p.client?.company_wp_id).filter(Boolean))].map(id => companyByWp.get(id)).filter(Boolean)
    : plan.companies
  const newCompanies = companies.filter(c => c.action === 'crear')
  const documents = plan.documents.filter(d => inScope(d.project_wp_id))
  const reports = []
  const lines = readline.createInterface({ input: fs.createReadStream(path.join(WORK_DIR, 'plan-reports.jsonl'), 'utf8'), crlfDelay: Infinity })
  for await (const line of lines) {
    if (!line.trim()) continue
    const row = JSON.parse(line)
    if (inScope(row.wp_project_id)) reports.push(row)
  }

  const cache = loadCache()
  const uploaded = new Set(fs.existsSync(MEDIA_MANIFEST) ? fs.readFileSync(MEDIA_MANIFEST, 'utf8').split('\n').filter(Boolean) : [])
  const knownMissing = new Set(cache.missing)
  // Los perfiles se completan solo en la carga completa
  const profiles = only ? [] : plan.profiles
  const mediaRels = [...new Set([
    ...reports.flatMap(r => r._media),
    ...newProjects.map(p => p.image_path),
    ...newCompanies.map(c => c.logo_path),
    ...profiles.flatMap(p => [p.fill.signature_url, p.fill.avatar_url])
  ].filter(Boolean))]
  const pendingMedia = mediaRels.filter(rel => !uploaded.has(rel) && !knownMissing.has(rel))
  const bytesOf = rels => rels.reduce((sum, rel) => sum + (cache.sizes[rel] ?? 0), 0)
  const existingMap = await fetchAll(sb, 'legacy_wp_id_map', 'entity,wp_id', ['entity', 'wp_id'])
  const importedDocs = new Set(existingMap.filter(m => m.entity === 'documento').map(m => Number(m.wp_id)))
  const pendingDocs = documents.filter(d => !importedDocs.has(d.map_wp_id))

  console.log(`== ${write ? 'Importación' : 'Simulación (agrega --write para ejecutar)'}: ${only ? `proyectos de WordPress ${only.join(', ')}` : 'todo el plan'} ==`)
  console.log(`Proyectos: ${projects.length} (${newProjects.length} se crean archivados, ${projects.length - newProjects.length} ya existen)`)
  newProjects.forEach(p => console.log(`  + ${p.insert.project_code} ${p.insert.name} → cliente ${p.client.name}`))
  console.log(`Empresas: ${newCompanies.length} se crean${newCompanies.length ? ` (${newCompanies.map(c => c.name).join('; ')})` : ''}`)
  console.log(`Informes: ${reports.length}`)
  console.log(`Imágenes: ${mediaRels.length} (${pendingMedia.length} por copiar, ${(bytesOf(pendingMedia) / 1024 ** 2).toFixed(0)} MB; ${mediaRels.filter(rel => knownMissing.has(rel)).length} ya no existen en WordPress)`)
  console.log(`Documentos: ${documents.length} archivos (${pendingDocs.length} por copiar, ${(bytesOf(pendingDocs.map(d => d.rel)) / 1024 ** 2).toFixed(0)} MB)`)
  if (!only) console.log(`Perfiles: ${profiles.length} se completan, solo en los campos que sigan vacíos`)
  if (!write) return

  const failures = []
  const mediaUrl = key => `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${key}`
  const check = (what, { error }) => {
    if (error) throw new Error(`${what}: ${error.message}`)
  }
  const remember = async rows => {
    if (rows.length) check('legacy_wp_id_map', await sb.from('legacy_wp_id_map').upsert(rows, { onConflict: 'entity,wp_id', ignoreDuplicates: true }))
  }

  // 1. Imágenes de informes, proyectos y logos
  let copied = 0
  let changed = 0
  const manifest = fs.createWriteStream(MEDIA_MANIFEST, { flags: 'a', mode: 0o600 })
  await pool(pendingMedia, 6, async rel => {
    try {
      const file = await downloadFromWordPress(rel)
      if (!file) {
        cache.missing.push(rel)
        return
      }
      if (cache.sizes[rel] !== undefined && cache.sizes[rel] !== file.buffer.length) changed++
      await uploadObject(sb, MEDIA_BUCKET, storageKey(rel), file)
      uploaded.add(rel)
      manifest.write(`${rel}\n`)
      if (++copied % 100 === 0) console.log(`  ${copied} de ${pendingMedia.length} imágenes copiadas`)
    } catch (error) {
      failures.push(error.message)
    }
  })
  await new Promise(resolve => manifest.end(resolve))
  saveCache(cache)
  console.log(`Imágenes copiadas: ${copied}${changed ? ` (${changed} con tamaño distinto al registrado en el servidor)` : ''}`)

  // 2. Empresas y proyectos archivados
  if (newCompanies.length) {
    const rows = newCompanies.map(c => ({ id: c.target_id, ...c.insert, logo_url: uploaded.has(c.logo_path) ? mediaUrl(storageKey(c.logo_path)) : null }))
    check('companies', await sb.from('companies').upsert(rows, { onConflict: 'id', ignoreDuplicates: true }))
  }
  await remember(companies.map(c => ({ entity: 'empresa', wp_id: c.wp_id, target_id: c.target_id, created_by_import: c.action === 'crear', details: { name: c.name } })))
  if (newProjects.length) {
    const rows = newProjects.map(p => ({
      id: p.target_id,
      ...p.insert,
      client_company_id: p.client_company_id,
      logo_url: uploaded.has(p.image_path) ? mediaUrl(storageKey(p.image_path)) : null
    }))
    check('projects', await sb.from('projects').upsert(rows, { onConflict: 'id', ignoreDuplicates: true }))
  }
  await remember(projects.map(p => ({ entity: 'proyecto', wp_id: p.wp_id, target_id: p.target_id, created_by_import: p.action === 'crear_archivado', details: { title: p.title } })))
  console.log(`Empresas creadas: ${newCompanies.length} | proyectos creados: ${newProjects.length}`)

  // 3. Informes: si ya estaban importados se actualizan con la versión de WordPress
  const now = new Date().toISOString()
  for (let i = 0; i < reports.length; i += 20) {
    const rows = reports.slice(i, i + 20).map(report => {
      const row = { ...report, updated_at: now }
      delete row._media
      return row
    })
    check('legacy_wp_reports', await sb.from('legacy_wp_reports').upsert(rows, { onConflict: 'wp_post_id' }))
  }
  console.log(`Informes importados: ${reports.length}`)

  // 4. Documentos legales en el bucket privado
  let docsCopied = 0
  const projectsWithNewDocs = new Set()
  for (const d of pendingDocs) {
    try {
      const file = await downloadFromWordPress(d.rel)
      if (!file) throw new Error(`${d.rel} ya no existe en WordPress`)
      if (d.md5 && md5(file.buffer) !== d.md5) throw new Error(`${d.rel}: el contenido descargado no coincide con el del servidor`)
      const contentType = d.insert.mime_type || file.contentType
      // Storage no acepta archivos de más de 50 MB: se sube la versión comprimida
      // preparada en compressed/<doc_id>.pdf y se deja constancia del original.
      let buffer = file.buffer
      let compressed = null
      if (buffer.length > MAX_FILE_BYTES) {
        const prepared = path.join(WORK_DIR, 'compressed', `${d.doc_id}.pdf`)
        if (!fs.existsSync(prepared)) throw new Error(`${d.rel} pesa ${(buffer.length / 1024 ** 2).toFixed(1)} MB y no hay versión comprimida en ${prepared}`)
        const smaller = fs.readFileSync(prepared)
        if (smaller.length > MAX_FILE_BYTES) throw new Error(`la versión comprimida de ${d.rel} sigue pasando de 50 MB`)
        compressed = { original_bytes: buffer.length, original_md5: md5(buffer), bytes: smaller.length, method: 'PyMuPDF, imágenes a 150 dpi, JPEG calidad 70' }
        buffer = smaller
      }
      await uploadObject(sb, DOCS_BUCKET, legacyDocumentObjectPath(d.project_id, d.doc_id, d.insert.file_name), { buffer, contentType })
      const description = compressed
        ? `${d.insert.description ?? d.insert.file_name} (versión comprimida para la plataforma; el original de WordPress pesa ${(compressed.original_bytes / 1024 ** 2).toFixed(1)} MB)`
        : d.insert.description
      const row = { id: d.doc_id, project_id: d.project_id, ...d.insert, description, mime_type: contentType, file_url: legacyDocumentUrl(d.doc_id), file_size: buffer.length }
      check('project_documents', await sb.from('project_documents').upsert(row, { onConflict: 'id', ignoreDuplicates: true }))
      await remember([{ entity: 'documento', wp_id: d.map_wp_id, target_id: d.doc_id, created_by_import: true, details: compressed ? { ...d.details, compressed } : d.details }])
      projectsWithNewDocs.add(d.project_id)
      docsCopied++
    } catch (error) {
      failures.push(`Documento WP #${d.document_wp_id}: ${error.message}`)
    }
  }
  // Un trigger de project_documents marca actividad "ahora" en el proyecto;
  // en los archivados creados aquí se restablece la fecha de su último informe.
  for (const p of newProjects.filter(p => projectsWithNewDocs.has(p.target_id) && p.insert.last_activity_at)) {
    check('projects', await sb.from('projects').update({ last_activity_at: p.insert.last_activity_at }).eq('id', p.target_id))
  }
  console.log(`Documentos importados: ${docsCopied}`)

  // 5. Perfiles: cada campo se escribe solo si sigue vacío en ese momento
  let filledProfiles = 0
  for (const p of profiles) {
    const filled = {}
    for (const [field, value] of Object.entries(p.fill)) {
      const isImage = field === 'signature_url' || field === 'avatar_url'
      if (isImage && !uploaded.has(value)) continue
      const newValue = isImage ? mediaUrl(storageKey(value)) : value
      const { data: updated, error } = await sb.from('profiles').update({ [field]: newValue })
        .eq('id', p.profile_id).or(`${field}.is.null,${field}.eq.`).select('id')
      if (error) failures.push(`Perfil ${p.name} (${field}): ${error.message}`)
      else if (updated.length) filled[field] = newValue
    }
    if (!Object.keys(filled).length) continue
    // El rollback usa details.filled para deshacer solo lo que siga igual
    const { data: previous } = await sb.from('legacy_wp_id_map').select('details').eq('entity', 'usuario').eq('wp_id', p.wp_user_id).maybeSingle()
    const details = { filled: { ...(previous?.details?.filled ?? {}), ...filled } }
    check('legacy_wp_id_map', await sb.from('legacy_wp_id_map').upsert(
      { entity: 'usuario', wp_id: p.wp_user_id, target_id: p.profile_id, created_by_import: false, details },
      { onConflict: 'entity,wp_id' }
    ))
    filledProfiles++
  }
  if (!only) console.log(`Perfiles completados: ${filledProfiles}`)

  // 6. Verificación contra lo que quedó en Supabase
  const countOf = async (what, query) => {
    const { count, error } = await query
    if (error) throw new Error(`verificación de ${what}: ${error.message}`)
    return count
  }
  const storedReports = await countOf('informes', sb.from('legacy_wp_reports').select('id', { count: 'exact', head: true }).in('wp_project_id', projects.map(p => p.wp_id)))
  const storedDocs = documents.length
    ? await countOf('documentos', sb.from('legacy_wp_id_map').select('wp_id', { count: 'exact', head: true }).eq('entity', 'documento').in('wp_id', documents.map(d => d.map_wp_id)))
    : 0
  console.log(`\nVerificación en Supabase: ${storedReports} informes (esperados ${reports.length}), ${storedDocs} documentos (esperados ${documents.length})`)
  if (storedReports !== reports.length) failures.push(`Informes en Supabase: ${storedReports}, esperados: ${reports.length}`)
  if (storedDocs !== documents.length) failures.push(`Documentos en Supabase: ${storedDocs}, esperados: ${documents.length}`)
  if (failures.length) {
    console.log(`\nPendientes por errores (${failures.length}); se reintentan al repetir el comando:`)
    failures.slice(0, 20).forEach(message => console.log(`  - ${message}`))
    process.exitCode = 1
  }
}

const commands = { export: cmdExport, plan: cmdPlan, apply: cmdApply }
const [command, ...args] = process.argv.slice(2)
if (!commands[command]) {
  console.log('Uso: node scripts/wp-legacy/migrate.mjs <export [--since "AAAA-MM-DD HH:MM:SS"] | plan [--offline] | apply [--projects 55603,115] [--write]>')
  process.exit(command ? 1 : 0)
}
commands[command](args).catch(error => {
  console.error(`Error: ${error.message}`)
  process.exit(1)
})
