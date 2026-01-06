/**
 * Placeholder Replacer para Informes Quincenales
 * Reemplaza {{placeholders}} con datos reales
 */

import { 
  formatDailyLogsData, 
  formatQualityControlData, 
  formatPhotosGallery 
} from './data-collector'

interface ReplacementContext {
  project: any
  periodStart: string
  periodEnd: string
  dailyLogs: any[]
  qualityControl: any[]
  photos: any[]
  summary: any
}

/**
 * Reemplaza todos los placeholders en un texto con datos reales
 */
export function replacePlaceholders(
  content: string,
  context: ReplacementContext
): string {
  if (!content) return ''

  let result = content

  // Placeholders de proyecto
  result = result.replace(/\{\{project_name\}\}/g, context.project?.name || 'N/A')
  result = result.replace(/\{\{project_code\}\}/g, context.project?.project_code || 'N/A')
  result = result.replace(/\{\{project_location\}\}/g, context.project?.location || 'N/A')
  result = result.replace(/\{\{project_address\}\}/g, context.project?.address || context.project?.location || 'N/A')
  result = result.replace(/\{\{project_client\}\}/g, context.project?.client_name || 'N/A')

  // Placeholders de período
  const startDate = new Date(context.periodStart).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const endDate = new Date(context.periodEnd).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  result = result.replace(/\{\{period_start\}\}/g, startDate)
  result = result.replace(/\{\{period_end\}\}/g, endDate)
  result = result.replace(/\{\{period_start_short\}\}/g, new Date(context.periodStart).toLocaleDateString('es-CO'))
  result = result.replace(/\{\{period_end_short\}\}/g, new Date(context.periodEnd).toLocaleDateString('es-CO'))

  // Placeholders de resumen
  result = result.replace(/\{\{total_days\}\}/g, String(context.summary?.totalDays || 0))
  result = result.replace(/\{\{work_days\}\}/g, String(context.summary?.workDays || 0))
  result = result.replace(/\{\{rain_days\}\}/g, String(context.summary?.rainDays || 0))
  result = result.replace(/\{\{total_workers\}\}/g, String(context.summary?.totalWorkers || 0))
  result = result.replace(/\{\{total_tests\}\}/g, String(context.summary?.totalTests || 0))
  result = result.replace(/\{\{passed_tests\}\}/g, String(context.summary?.passedTests || 0))
  result = result.replace(/\{\{failed_tests\}\}/g, String(context.summary?.failedTests || 0))

  // Placeholders de bitácoras
  result = result.replace(/\{\{bitacora\.actividades\}\}/g, formatDailyLogsData(context.dailyLogs))
  result = result.replace(/\{\{bitacora\.tabla\}\}/g, formatDailyLogsData(context.dailyLogs))
  
  // Resumen de actividades (lista)
  const activitiesList = context.dailyLogs
    .map(log => log.activities)
    .filter(Boolean)
    .join(', ')
  result = result.replace(/\{\{bitacora\.resumen\}\}/g, activitiesList || 'No se registraron actividades')

  // Personal promedio
  const avgWorkers = context.summary?.totalDays > 0 
    ? Math.round(context.summary.totalWorkers / context.summary.totalDays)
    : 0
  result = result.replace(/\{\{bitacora\.personal\}\}/g, String(avgWorkers))

  // Placeholders de control de calidad
  result = result.replace(/\{\{qc\.ensayos\}\}/g, formatQualityControlData(context.qualityControl))
  result = result.replace(/\{\{qc\.tabla\}\}/g, formatQualityControlData(context.qualityControl))
  
  // Resumen de resultados de QC
  const qcSummary = `
    <p>Durante el período se realizaron <strong>${context.summary?.totalTests || 0}</strong> ensayos de control de calidad:</p>
    <ul>
      <li>Aprobados: <strong class="text-green-600">${context.summary?.passedTests || 0}</strong></li>
      <li>Rechazados: <strong class="text-red-600">${context.summary?.failedTests || 0}</strong></li>
      <li>Pendientes: <strong>${(context.summary?.totalTests || 0) - (context.summary?.passedTests || 0) - (context.summary?.failedTests || 0)}</strong></li>
    </ul>
  `
  result = result.replace(/\{\{qc\.resultados\}\}/g, qcSummary)

  // Porcentaje de aprobados
  const totalTests = context.summary?.totalTests || 0
  const passedTests = context.summary?.passedTests || 0
  const porcentajeAprobados = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
  result = result.replace(/\{\{qc\.porcentaje_aprobados\}\}/g, String(porcentajeAprobados))

  // Placeholders de summary con notación de punto
  result = result.replace(/\{\{summary\.work_days\}\}/g, String(context.summary?.workDays || 0))
  result = result.replace(/\{\{summary\.rain_days\}\}/g, String(context.summary?.rainDays || 0))
  result = result.replace(/\{\{summary\.total_workers\}\}/g, String(context.summary?.totalWorkers || 0))
  result = result.replace(/\{\{summary\.total_tests\}\}/g, String(context.summary?.totalTests || 0))
  result = result.replace(/\{\{summary\.passed_tests\}\}/g, String(context.summary?.passedTests || 0))
  result = result.replace(/\{\{summary\.failed_tests\}\}/g, String(context.summary?.failedTests || 0))

  // Placeholders de fotos
  result = result.replace(/\{\{fotos\}\}/g, formatPhotosGallery(context.photos))
  result = result.replace(/\{\{fotos\.galeria\}\}/g, formatPhotosGallery(context.photos))
  result = result.replace(/\{\{total_fotos\}\}/g, String(context.photos?.length || 0))

  // Fecha actual
  const currentDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  result = result.replace(/\{\{fecha_actual\}\}/g, currentDate)

  return result
}

/**
 * Obtiene lista de placeholders disponibles con sus descripciones
 */
export function getAvailablePlaceholders(): Array<{ placeholder: string, description: string, category: string }> {
  return [
    // Proyecto
    { placeholder: '{{project_name}}', description: 'Nombre del proyecto', category: 'Proyecto' },
    { placeholder: '{{project_code}}', description: 'Código del proyecto', category: 'Proyecto' },
    { placeholder: '{{project_location}}', description: 'Ubicación del proyecto', category: 'Proyecto' },
    { placeholder: '{{project_client}}', description: 'Cliente del proyecto', category: 'Proyecto' },
    
    // Período
    { placeholder: '{{period_start}}', description: 'Fecha inicio (formato largo)', category: 'Período' },
    { placeholder: '{{period_end}}', description: 'Fecha fin (formato largo)', category: 'Período' },
    { placeholder: '{{period_start_short}}', description: 'Fecha inicio (formato corto)', category: 'Período' },
    { placeholder: '{{period_end_short}}', description: 'Fecha fin (formato corto)', category: 'Período' },
    
    // Resumen
    { placeholder: '{{total_days}}', description: 'Total de días del período', category: 'Resumen' },
    { placeholder: '{{work_days}}', description: 'Días trabajados', category: 'Resumen' },
    { placeholder: '{{rain_days}}', description: 'Días con lluvia', category: 'Resumen' },
    { placeholder: '{{total_workers}}', description: 'Total de trabajadores', category: 'Resumen' },
    { placeholder: '{{total_tests}}', description: 'Total de ensayos', category: 'Resumen' },
    { placeholder: '{{passed_tests}}', description: 'Ensayos aprobados', category: 'Resumen' },
    { placeholder: '{{failed_tests}}', description: 'Ensayos rechazados', category: 'Resumen' },
    
    // Bitácoras
    { placeholder: '{{bitacora.actividades}}', description: 'Tabla de actividades diarias', category: 'Bitácoras' },
    { placeholder: '{{bitacora.tabla}}', description: 'Tabla de bitácoras', category: 'Bitácoras' },
    { placeholder: '{{bitacora.resumen}}', description: 'Resumen de actividades', category: 'Bitácoras' },
    { placeholder: '{{bitacora.personal}}', description: 'Personal promedio', category: 'Bitácoras' },
    
    // Control de Calidad
    { placeholder: '{{qc.ensayos}}', description: 'Tabla de ensayos', category: 'Control de Calidad' },
    { placeholder: '{{qc.tabla}}', description: 'Tabla de control de calidad', category: 'Control de Calidad' },
    { placeholder: '{{qc.resultados}}', description: 'Resumen de resultados', category: 'Control de Calidad' },
    
    // Fotos
    { placeholder: '{{fotos}}', description: 'Galería de fotos', category: 'Fotos' },
    { placeholder: '{{fotos.galeria}}', description: 'Galería de fotos', category: 'Fotos' },
    { placeholder: '{{total_fotos}}', description: 'Total de fotos', category: 'Fotos' },
    
    // Otros
    { placeholder: '{{fecha_actual}}', description: 'Fecha actual', category: 'Otros' },
  ]
}
