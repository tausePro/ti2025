/**
 * Data Collector para Informes Quincenales
 * Recopila datos de bitácoras, control de calidad, fotos, etc.
 */

import { createClient } from '@/lib/supabase/server'

interface CollectedData {
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

/**
 * Recopila todos los datos del proyecto para un período específico
 */
export async function collectReportData(
  projectId: string,
  periodStart: string,
  periodEnd: string
): Promise<CollectedData> {
  const supabase = createClient()

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
  const { data: photos } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('file_type', 'photo')
    .gte('uploaded_at', periodStart)
    .lte('uploaded_at', periodEnd)
    .order('uploaded_at', { ascending: true })

  // 5. Calcular resumen
  const workDays = dailyLogs?.filter(log => log.weather !== 'lluvia_intensa' && log.weather !== 'lluvioso').length || 0
  const rainDays = dailyLogs?.filter(log => log.weather === 'lluvia_intensa' || log.weather === 'lluvioso').length || 0
  
  const totalWorkers = dailyLogs?.reduce((sum, log) => {
    return sum + (log.personnel_count || 0)
  }, 0) || 0

  const totalTests = qualityControl?.length || 0
  const passedTests = qualityControl?.filter(qc => qc.overall_result === 'aprobado').length || 0
  const failedTests = qualityControl?.filter(qc => qc.overall_result === 'rechazado').length || 0

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
  html += '</tr></thead><tbody>'

  dailyLogs.forEach(log => {
    html += '<tr>'
    html += `<td class="border border-gray-300 px-4 py-2">${new Date(log.date).toLocaleDateString('es-CO')}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${log.activities || 'N/A'}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${log.personnel_count || 0}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${log.weather || 'N/A'}</td>`
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
    const resultClass = qc.overall_result === 'aprobado' ? 'text-green-600' : 
                       qc.overall_result === 'rechazado' ? 'text-red-600' : ''
    
    html += '<tr>'
    html += `<td class="border border-gray-300 px-4 py-2">${qc.sample_code}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${new Date(qc.sample_date).toLocaleDateString('es-CO')}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${qc.template?.template_name || 'N/A'}</td>`
    html += `<td class="border border-gray-300 px-4 py-2">${qc.location || 'N/A'}</td>`
    html += `<td class="border border-gray-300 px-4 py-2 ${resultClass}">${qc.overall_result || 'Pendiente'}</td>`
    html += '</tr>'
  })

  html += '</tbody></table>'
  return html
}

/**
 * Formatea galería de fotos para insertar en el informe
 */
export function formatPhotosGallery(photos: any[]): string {
  if (!photos || photos.length === 0) {
    return '<p>No se cargaron fotos en este período.</p>'
  }

  let html = '<div class="grid grid-cols-3 gap-4">'
  
  photos.slice(0, 9).forEach(photo => { // Máximo 9 fotos
    html += `<div class="border border-gray-300 p-2">`
    html += `<img src="${photo.file_url}" alt="${photo.file_name}" class="w-full h-48 object-cover" />`
    html += `<p class="text-sm text-gray-600 mt-2">${photo.description || photo.file_name}</p>`
    html += `</div>`
  })

  html += '</div>'
  
  if (photos.length > 9) {
    html += `<p class="text-sm text-gray-500 mt-2">+ ${photos.length - 9} fotos adicionales</p>`
  }

  return html
}
