/**
 * Data Collector para Informes Quincenales
 * Recopila datos de bitácoras, control de calidad, fotos, etc.
 */

import { createClient } from '@/lib/supabase/server'
import { formatDateValue } from '@/lib/utils'
import { PHOTO_GALLERY_MARKER, type CollectedPhoto } from './report-photos'
import { getPhotoCaptions } from '@/lib/photo-captions'

export interface CollectedData {
  project: any
  dailyLogs: any[]
  qualityControl: any[]
  photos: any[]
  summary: {
    totalDays: number
    workDays: number
    rainDays: number
    totalWorkers: number
    totalTests: number
    passedTests: number
    failedTests: number
  }
}

// El trigger actual escribe CUMPLE/NO CUMPLE/SIN EVALUAR; muestras antiguas
// pueden conservar aprobado/rechazado. Se aceptan ambos.
function isPassedResult(value: unknown): boolean {
  return value === 'CUMPLE' || value === 'aprobado'
}

function isFailedResult(value: unknown): boolean {
  return value === 'NO CUMPLE' || value === 'rechazado'
}

function normalizeDailyLogPhotos(dailyLogs: any[] = []) {
  return dailyLogs.flatMap((log: any) => {
    const photos: string[] = Array.isArray(log.photos) ? log.photos : []
    const captions = getPhotoCaptions(log.custom_fields?.photo_captions, photos.length, log.photos)
    const dateLabel = log.date ? formatDateValue(log.date) : ''
    const frontLabel = log.work_front ? ` – ${log.work_front}` : ''

    return photos
      .map((photoUrl: string, index: number) => ({ photoUrl, caption: captions[index] || '' }))
      .filter(({ photoUrl }) => Boolean(photoUrl))
      .map(({ photoUrl, caption }, index: number) => ({
        file_url: photoUrl,
        file_name: `bitacora-${log.date || 'sin-fecha'}-${index + 1}`,
        // Pie propuesto: leyenda de la bitácora; si no hay, fecha y frente.
        description: caption || `Bitácora ${dateLabel}${frontLabel}`.trim(),
        uploaded_at: log.time
          ? `${log.date}T${log.time}:00`
          : `${log.date}T00:00:00`,
        source_type: 'daily_log',
        source_id: log.id
      }))
  })
}

function mergePhotos(documentPhotos: any[] = [], dailyLogPhotos: any[] = []) {
  const uniquePhotos = new Map<string, any>()

  ;[...documentPhotos, ...dailyLogPhotos].forEach((photo: any) => {
    const photoUrl = photo?.file_url

    if (!photoUrl || uniquePhotos.has(photoUrl)) {
      return
    }

    uniquePhotos.set(photoUrl, photo)
  })

  return Array.from(uniquePhotos.values()).sort((a: any, b: any) => {
    const first = new Date(a?.uploaded_at || 0).getTime()
    const second = new Date(b?.uploaded_at || 0).getTime()
    return first - second
  })
}

function getChecklistSections(log: any) {
  return (log?.custom_fields?.checklists || [])
    .map((section: any) => ({
      ...section,
      items: (section.items || []).filter((item: any) =>
        item.status === 'compliant' || item.status === 'non_compliant'
      )
    }))
    .filter((section: any) => section.items?.length)
}

function getChecklistSummary(log: any) {
  const allItems = getChecklistSections(log).flatMap((section: any) => section.items || [])
  const compliant = allItems.filter((item: any) => item.status === 'compliant').length
  const nonCompliant = allItems.filter((item: any) => item.status === 'non_compliant').length
  const totalReviewed = compliant + nonCompliant

  if (totalReviewed === 0) {
    return null
  }

  return {
    compliant,
    nonCompliant,
    totalReviewed
  }
}

function getCustomFieldEntries(log: any) {
  const customFields = log?.custom_fields || {}
  const fieldLabels: Record<string, string> = customFields._field_labels || {}

  return Object.entries(customFields)
    .filter(([key, value]) => {
      if (key === 'checklists' || key === '_field_labels' || key === 'photo_count') {
        return false
      }

      if (value === null || value === undefined) {
        return false
      }

      if (Array.isArray(value)) {
        return value.length > 0
      }

      if (typeof value === 'string') {
        return value.trim().length > 0
      }

      return true
    })
    .map(([key, value]) => ({
      key,
      label: fieldLabels[key] || key.replace(/_/g, ' '),
      value: Array.isArray(value) ? value.join(', ') : String(value)
    }))
}

function formatChecklistSummaryCell(log: any) {
  const summary = getChecklistSummary(log)

  if (!summary) {
    return 'Sin revisión'
  }

  return `${summary.compliant} cumple / ${summary.nonCompliant} no cumple`
}

function formatCustomFieldsCell(log: any) {
  const entries = getCustomFieldEntries(log)

  if (!entries.length) {
    return 'N/A'
  }

  return entries
    .map((entry) => `<div><strong>${entry.label}:</strong> ${entry.value}</div>`)
    .join('')
}

export function formatDailyLogChecklistSummary(dailyLogs: any[]): string {
  const summaries = dailyLogs
    .map((log) => getChecklistSummary(log))
    .filter(Boolean) as Array<{ compliant: number, nonCompliant: number, totalReviewed: number }>

  if (!summaries.length) {
    return '<p>No se registraron ítems de checklist revisados en este período.</p>'
  }

  const totals = summaries.reduce(
    (acc, summary) => ({
      compliant: acc.compliant + summary.compliant,
      nonCompliant: acc.nonCompliant + summary.nonCompliant,
      totalReviewed: acc.totalReviewed + summary.totalReviewed
    }),
    { compliant: 0, nonCompliant: 0, totalReviewed: 0 }
  )

  return `
    <ul>
      <li><strong>Ítems revisados:</strong> ${totals.totalReviewed}</li>
      <li><strong>Cumple:</strong> ${totals.compliant}</li>
      <li><strong>No cumple:</strong> ${totals.nonCompliant}</li>
      <li><strong>Bitácoras con checklist revisado:</strong> ${summaries.length}</li>
    </ul>
  `.trim()
}

export function formatDailyLogChecklists(dailyLogs: any[]): string {
  const logsWithChecklist = dailyLogs
    .map((log) => ({
      log,
      sections: getChecklistSections(log)
    }))
    .filter(({ sections }) => sections.length > 0)

  if (!logsWithChecklist.length) {
    return '<p>No se registraron checklist revisados en este período.</p>'
  }

  return logsWithChecklist
    .map(({ log, sections }) => {
      const summary = getChecklistSummary(log)
      const dateLabel = log?.date ? formatDateValue(log.date) : 'Sin fecha'
      const sectionsHtml = sections
        .map((section: any) => `
          <div class="mb-3 rounded border border-gray-200">
            <div class="bg-gray-50 px-3 py-2 font-semibold text-gray-800">${section.title}</div>
            <div class="divide-y divide-gray-100">
              ${(section.items || [])
                .map((item: any) => `
                  <div class="px-3 py-2 text-sm">
                    <p class="font-medium text-gray-900">${item.description}</p>
                    ${item.observations ? `<p class="mt-1 text-gray-500">${item.observations}</p>` : ''}
                    <p class="mt-1 ${item.status === 'compliant' ? 'text-green-600' : 'text-red-600'}">
                      ${item.status === 'compliant' ? 'Cumple' : 'No cumple'}
                    </p>
                  </div>
                `)
                .join('')}
            </div>
          </div>
        `)
        .join('')

      return `
        <div class="mb-6">
          <h4 class="mb-2 text-base font-semibold text-gray-900">Bitácora ${dateLabel}</h4>
          ${summary ? `<p class="mb-3 text-sm text-gray-600"><strong>Cumple:</strong> ${summary.compliant} | <strong>No cumple:</strong> ${summary.nonCompliant}</p>` : ''}
          ${sectionsHtml}
        </div>
      `.trim()
    })
    .join('')
}

export function formatDailyLogCustomFields(dailyLogs: any[]): string {
  const logsWithFields = dailyLogs
    .map((log) => ({
      log,
      entries: getCustomFieldEntries(log)
    }))
    .filter(({ entries }) => entries.length > 0)

  if (!logsWithFields.length) {
    return '<p>No se registraron campos personalizados en este período.</p>'
  }

  return logsWithFields
    .map(({ log, entries }) => {
      const dateLabel = log?.date ? formatDateValue(log.date) : 'Sin fecha'

      return `
        <div class="mb-4">
          <h4 class="mb-2 text-base font-semibold text-gray-900">Bitácora ${dateLabel}</h4>
          <ul>
            ${entries
              .map((entry) => `<li><strong>${entry.label}:</strong> ${entry.value}</li>`)
              .join('')}
          </ul>
        </div>
      `.trim()
    })
    .join('')
}

/**
 * Recopila todos los datos del proyecto para un período específico
 */
export async function collectReportData(
  projectId: string,
  periodStart: string,
  periodEnd: string
): Promise<CollectedData> {
  const supabase = await createClient()

  // 1. Información del proyecto
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  // 2. Bitácoras diarias del período
  const { data: dailyLogs } = await supabase
    .from('daily_logs')
    .select(`
      *,
      created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email)
    `)
    .eq('project_id', projectId)
    .gte('date', periodStart)
    .lte('date', periodEnd)
    .order('date', { ascending: true })

  // 3. Control de calidad del período
  const { data: qualityControl } = await supabase
    .from('quality_control_samples')
    .select(`
      *,
      template:quality_templates(template_name, template_type),
      tests:quality_test_results(*)
    `)
    .eq('project_id', projectId)
    .gte('sample_date', periodStart)
    .lte('sample_date', periodEnd)
    .order('sample_date', { ascending: true })

  // 4. Fotos del período (de bitácoras y documentos)
  const { data: documentPhotos } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('file_type', 'photo')
    .gte('uploaded_at', periodStart)
    .lte('uploaded_at', periodEnd)
    .order('uploaded_at', { ascending: true })

  const dailyLogPhotos = normalizeDailyLogPhotos(dailyLogs || [])
  const photos = mergePhotos(documentPhotos || [], dailyLogPhotos)

  // 5. Calcular resumen
  const workDays = dailyLogs?.filter(log => log.weather !== 'lluvia_intensa' && log.weather !== 'lluvioso').length || 0
  const rainDays = dailyLogs?.filter(log => log.weather === 'lluvia_intensa' || log.weather === 'lluvioso').length || 0
  
  const totalWorkers = dailyLogs?.reduce((sum, log) => {
    return sum + (log.personnel_count || 0)
  }, 0) || 0

  const totalTests = qualityControl?.length || 0
  const passedTests = qualityControl?.filter(qc => isPassedResult(qc.overall_result)).length || 0
  const failedTests = qualityControl?.filter(qc => isFailedResult(qc.overall_result)).length || 0

  return {
    project: project || {},
    dailyLogs: dailyLogs || [],
    qualityControl: qualityControl || [],
    photos: photos || [],
    summary: {
      totalDays: dailyLogs?.length || 0,
      workDays,
      rainDays,
      totalWorkers,
      totalTests,
      passedTests,
      failedTests
    }
  }
}

/**
 * Formatea datos de bitácoras para insertar en el informe
 */
export function formatDailyLogsData(dailyLogs: any[]): string {
  if (!dailyLogs || dailyLogs.length === 0) {
    return '<p>No se registraron bitácoras en este período.</p>'
  }

  let html = '<table class="w-full border-collapse border border-gray-300">'
  html += '<thead><tr class="bg-gray-100">'
  html += '<th class="border border-gray-300 px-4 py-2">Fecha</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Actividades</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Personal</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Clima</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Checklist</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Campos personalizados</th>'
  html += '</tr></thead><tbody>'

  dailyLogs.forEach(log => {
    html += '<tr>'
    html += `<td class="border border-gray-300 px-4 py-2 align-top">${formatDateValue(log.date)}</td>`
    html += `<td class="border border-gray-300 px-4 py-2 align-top">${log.activities || 'N/A'}</td>`
    html += `<td class="border border-gray-300 px-4 py-2 align-top">${log.personnel_count || 0}</td>`
    html += `<td class="border border-gray-300 px-4 py-2 align-top">${log.weather || 'N/A'}</td>`
    html += `<td class="border border-gray-300 px-4 py-2 align-top">${formatChecklistSummaryCell(log)}</td>`
    html += `<td class="border border-gray-300 px-4 py-2 align-top">${formatCustomFieldsCell(log)}</td>`
    html += '</tr>'
  })

  html += '</tbody></table>'
  return html
}

/**
 * Formatea datos de control de calidad para insertar en el informe
 */
export function formatQualityControlData(qualityControl: any[]): string {
  if (!qualityControl || qualityControl.length === 0) {
    return '<p>No se realizaron ensayos de control de calidad en este período.</p>'
  }

  let html = '<table class="w-full border-collapse border border-gray-300">'
  html += '<thead><tr class="bg-gray-100">'
  html += '<th class="border border-gray-300 px-4 py-2">Código</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Fecha</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Tipo</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Ubicación</th>'
  html += '<th class="border border-gray-300 px-4 py-2">Resultado</th>'
  html += '</tr></thead><tbody>'

  qualityControl.forEach(qc => {
    const resultClass = isPassedResult(qc.overall_result) ? 'text-green-600' :
                       isFailedResult(qc.overall_result) ? 'text-red-600' : ''
    
    html += '<tr>'
    html += `<td class="border border-gray-300 px-4 py-2">${qc.sample_code}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${formatDateValue(qc.sample_date)}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${qc.template?.template_name || 'N/A'}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${qc.location || 'N/A'}</td>`
    html += `<td class="border border-gray-300 px-4 py-2 ${resultClass}">${qc.overall_result || 'Pendiente'}</td>`
    html += '</tr>'
  })

  html += '</tbody></table>'
  return html
}

/**
 * Formatea galería de fotos para insertar en el informe.
 *
 * Desde la etapa 1 del informe quincenal la galería NO se incrusta en el
 * HTML al generar: se deja un marcador que preview/impresión resuelven con
 * las fotos curadas del informe (biweekly_reports.report_photos). Así el
 * residente puede elegir, ordenar y titular las fotos después de generar,
 * sin límite artificial de cantidad.
 */
export function formatPhotosGallery(_photos: any[]): string {
  return PHOTO_GALLERY_MARKER
}

// -----------------------------------------------------------------------
// Conclusiones alimentadas por bitácora
// -----------------------------------------------------------------------

type PeriodNoteKind = 'observations' | 'issues' | 'recommendations'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function collectPeriodNotes(dailyLogs: any[] = [], kind: PeriodNoteKind) {
  return (dailyLogs || [])
    .map((log: any) => ({
      date: log?.date as string | undefined,
      workFront: log?.work_front as string | undefined,
      text: typeof log?.[kind] === 'string' ? log[kind].trim() : ''
    }))
    .filter((note) => note.text.length > 0)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
}

function renderPeriodNotes(notes: ReturnType<typeof collectPeriodNotes>, emptyMessage: string): string {
  if (notes.length === 0) {
    return `<p>${emptyMessage}</p>`
  }

  const items = notes
    .map((note) => {
      const dateLabel = note.date ? formatDateValue(note.date) : 'Sin fecha'
      const front = note.workFront ? ` – ${escapeHtml(note.workFront)}` : ''
      return `<li><strong>${dateLabel}${front}:</strong> ${escapeHtml(note.text)}</li>`
    })
    .join('')

  return `<ul>${items}</ul>`
}

/** Observaciones registradas día a día en las bitácoras del período. */
export function formatDailyLogObservations(dailyLogs: any[]): string {
  return renderPeriodNotes(
    collectPeriodNotes(dailyLogs, 'observations'),
    'No se registraron observaciones en las bitácoras del período.'
  )
}

/** Novedades / incidencias registradas en las bitácoras del período. */
export function formatDailyLogIssues(dailyLogs: any[]): string {
  return renderPeriodNotes(
    collectPeriodNotes(dailyLogs, 'issues'),
    'No se registraron novedades en las bitácoras del período.'
  )
}

/** Recomendaciones registradas en las bitácoras del período. */
export function formatDailyLogRecommendations(dailyLogs: any[]): string {
  return renderPeriodNotes(
    collectPeriodNotes(dailyLogs, 'recommendations'),
    'No se registraron recomendaciones en las bitácoras del período.'
  )
}

/**
 * Bloque consolidado para la sección de conclusiones: observaciones,
 * novedades y recomendaciones del período, cada una con fecha y frente.
 * Es el insumo que el residente complementa con su análisis.
 */
export function formatDailyLogConclusions(dailyLogs: any[]): string {
  const observations = collectPeriodNotes(dailyLogs, 'observations')
  const issues = collectPeriodNotes(dailyLogs, 'issues')
  const recommendations = collectPeriodNotes(dailyLogs, 'recommendations')

  if (observations.length + issues.length + recommendations.length === 0) {
    return '<p>Las bitácoras del período no registran observaciones, novedades ni recomendaciones.</p>'
  }

  let html = ''
  html += `<h4>Observaciones (${observations.length})</h4>`
  html += renderPeriodNotes(observations, 'Sin observaciones registradas.')
  html += `<h4>Novedades e incidencias (${issues.length})</h4>`
  html += renderPeriodNotes(issues, 'Sin novedades registradas.')
  html += `<h4>Recomendaciones (${recommendations.length})</h4>`
  html += renderPeriodNotes(recommendations, 'Sin recomendaciones registradas.')
  return html
}

// -----------------------------------------------------------------------
// Snapshot serializable para biweekly_reports.source_data
// -----------------------------------------------------------------------

/**
 * Construye el snapshot que se guarda en biweekly_reports.source_data.
 * Incluye los IDs de bitácora para poder detectar cambios posteriores y
 * las fotos recopiladas (bitácora + documentos) para la curaduría.
 */
export type ReportSourceSnapshot = ReturnType<typeof buildSourceSnapshot>

export function buildSourceSnapshot(collected: CollectedData) {
  const dailyLogs = (collected.dailyLogs || []).map((log: any) => ({
    id: log.id,
    date: log.date,
    time: log.time ?? null,
    weather: log.weather ?? null,
    personnel_count: log.personnel_count ?? null,
    work_front: log.work_front ?? null,
    element: log.element ?? null,
    activities: log.activities ?? null,
    observations: log.observations ?? null,
    issues: log.issues ?? null,
    recommendations: log.recommendations ?? null,
    photo_count: Array.isArray(log.photos) ? log.photos.filter(Boolean).length : 0,
    created_by: log.created_by ?? null,
    created_by_name: log.created_by_profile?.full_name ?? null,
    updated_at: log.updated_at ?? null
  }))

  const qualitySamples = (collected.qualityControl || []).map((qc: any) => ({
    id: qc.id,
    sample_code: qc.sample_code,
    sample_date: qc.sample_date,
    location: qc.location ?? null,
    overall_result: qc.overall_result ?? null,
    template_name: qc.template?.template_name ?? null,
    template_type: qc.template?.template_type ?? null
  }))

  const photos: CollectedPhoto[] = (collected.photos || []).map((photo: any) => ({
    id: photo.id ?? undefined,
    file_url: photo.file_url,
    file_name: photo.file_name ?? undefined,
    description: photo.description ?? undefined,
    uploaded_at: photo.uploaded_at ?? undefined,
    source_type: photo.source_type ?? 'project_document',
    source_id: photo.source_id ?? photo.id ?? undefined
  }))

  return {
    project_info: {
      id: collected.project?.id ?? null,
      name: collected.project?.name ?? null,
      project_code: collected.project?.project_code ?? null,
      address: collected.project?.address ?? collected.project?.location ?? null
    },
    daily_logs: dailyLogs,
    daily_log_ids: dailyLogs.map((log) => log.id).filter(Boolean),
    quality_samples: qualitySamples,
    photos,
    summary: {
      total_days: collected.summary.totalDays,
      work_days: collected.summary.workDays,
      rain_days: collected.summary.rainDays,
      total_workers: collected.summary.totalWorkers,
      total_tests: collected.summary.totalTests,
      passed_tests: collected.summary.passedTests,
      failed_tests: collected.summary.failedTests,
      total_photos: photos.length,
      // Compatibilidad con la UI que lee camelCase
      totalDays: collected.summary.totalDays,
      workDays: collected.summary.workDays,
      rainDays: collected.summary.rainDays,
      totalWorkers: collected.summary.totalWorkers,
      totalTests: collected.summary.totalTests,
      passedTests: collected.summary.passedTests,
      failedTests: collected.summary.failedTests
    },
    collected_at: new Date().toISOString()
  }
}
