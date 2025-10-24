// Tipos para configuración de bitácoras

export type CustomFieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'time'
  | 'select' 
  | 'multiselect'
  | 'checkbox'
  | 'radio'

export interface CustomField {
  id: string
  name: string
  label: string
  type: CustomFieldType
  required: boolean
  order: number
  options?: string[] // Para select, multiselect, radio
  placeholder?: string
  helpText?: string
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

export interface CustomChecklist {
  id: string
  title: string
  order: number
  items: {
    id: string
    description: string
    required: boolean
  }[]
}

export interface DailyLogSettings {
  require_photos: boolean
  min_photos: number
  max_photos: number
  require_signatures: boolean
  require_gps: boolean
  auto_assign_resident: boolean
}

export interface DailyLogConfig {
  id: string
  project_id: string
  is_enabled: boolean
  custom_fields: CustomField[]
  custom_checklists: CustomChecklist[]
  settings: DailyLogSettings
  created_by: string
  created_at: string
  updated_at: string
}

// Valores por defecto
export const DEFAULT_DAILY_LOG_SETTINGS: DailyLogSettings = {
  require_photos: false,
  min_photos: 0,
  max_photos: 10,
  require_signatures: false,
  require_gps: false,
  auto_assign_resident: true
}

export const CUSTOM_FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'time', label: 'Hora' },
  { value: 'select', label: 'Selección única' },
  { value: 'multiselect', label: 'Selección múltiple' },
  { value: 'checkbox', label: 'Casilla de verificación' },
  { value: 'radio', label: 'Opción única (radio)' }
]
