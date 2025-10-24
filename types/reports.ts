/**
 * Tipos para el sistema de reportes PDF
 */

// ============================================
// PLANTILLAS
// ============================================

export type ReportTemplateType = 'daily_log' | 'financial' | 'general' | 'custom'

export interface HeaderConfig {
  logo_url: string
  company_name: string
  show_project_code: boolean
  show_date: boolean
  custom_text: string
  background_color: string
  text_color: string
  height: number
}

export interface FooterConfig {
  show_page_numbers: boolean
  show_generation_date: boolean
  custom_text: string
  include_signatures: boolean
  text_color: string
  height: number
}

export interface StylesConfig {
  primary_color: string
  secondary_color: string
  accent_color: string
  font_family: string
  page_size: 'A4' | 'LETTER'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export interface SectionsConfig {
  cover_page: boolean
  table_of_contents: boolean
  executive_summary: boolean
  ai_insights: boolean
  detailed_logs: boolean
  photos: boolean
  checklists: boolean
  custom_fields: boolean
  signatures: boolean
  appendix: boolean
}

export interface ReportTemplate {
  id: string
  company_id: string | null
  template_name: string
  template_type: ReportTemplateType
  header_config: HeaderConfig
  footer_config: FooterConfig
  styles: StylesConfig
  sections: SectionsConfig
  type_specific_config: Record<string, any>
  is_default: boolean
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// ============================================
// REPORTES GENERADOS
// ============================================

export type ReportType = 'daily_log_weekly' | 'daily_log_monthly' | 'financial' | 'custom'
export type ReportStatus = 'generating' | 'completed' | 'failed' | 'archived'

export interface ReportMetadata {
  total_logs: number
  total_photos: number
  avg_personnel: number
  checklist_compliance: number
  issues_count: number
  [key: string]: any
}

export interface AIInsights {
  achievements: string[]
  concerns: string[]
  recommendations: string[]
  [key: string]: any
}

export interface GeneratedReport {
  id: string
  project_id: string
  template_id: string | null
  report_type: ReportType
  period_start: string
  period_end: string
  file_name: string
  file_url: string
  file_size: number | null
  metadata: ReportMetadata
  ai_summary: string | null
  ai_insights: AIInsights
  generated_by: string
  generated_at: string
  status: ReportStatus
  error_message: string | null
  view_count: number
  download_count: number
  last_accessed_at: string | null
}

// ============================================
// COLA DE GENERACIÓN
// ============================================

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ReportGenerationQueue {
  id: string
  project_id: string
  template_id: string | null
  report_type: ReportType
  parameters: Record<string, any>
  status: QueueStatus
  priority: number
  progress_percentage: number
  current_step: string | null
  result_report_id: string | null
  error_message: string | null
  requested_by: string
  requested_at: string
  started_at: string | null
  completed_at: string | null
  retry_count: number
  max_retries: number
}

// ============================================
// PARÁMETROS DE GENERACIÓN
// ============================================

export interface GenerateReportParams {
  project_id: string
  report_type: ReportType
  template_id?: string
  period_start: string
  period_end: string
  include_photos?: boolean
  include_ai_analysis?: boolean
  custom_options?: Record<string, any>
}

// ============================================
// DATOS PARA PDF
// ============================================

export interface DailyLogData {
  id: string
  date: string
  weather: string
  temperature: string
  personnel_count: number
  activities: string
  materials: string
  equipment: string
  observations: string
  issues: string
  recommendations: string
  photos: string[]
  checklists: any[]
  custom_fields: any[]
  signatures: any[]
  created_by: string
  created_at: string
}

export interface ProjectData {
  id: string
  name: string
  project_code: string
  description: string
  logo_url: string | null
  status: string
  start_date: string
  end_date: string | null
  company: {
    name: string
    logo_url: string | null
  }
}

export interface ReportData {
  project: ProjectData
  logs: DailyLogData[]
  template: ReportTemplate
  period: {
    start: string
    end: string
  }
  metadata: ReportMetadata
  ai_insights?: AIInsights
}
