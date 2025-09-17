// Tipos principales del sistema
export type UserRole = 'super_admin' | 'admin' | 'gerente' | 'supervisor' | 'residente' | 'cliente'
export type ProjectStatus = 'planificacion' | 'activo' | 'pausado' | 'finalizado' | 'active' | 'paused' | 'completed'
export type ReportStatus = 'borrador' | 'revision' | 'aprobado' | 'firmado' | 'enviado' | 'draft'
export type InterventionType = 'supervision_tecnica' | 'interventoria_administrativa'

// Interfaces de permisos
export interface Permission {
  module: string
  action: string
  allowed: boolean
}

export interface UserWithPermissions {
  id: string
  email: string
  full_name: string
  role: UserRole
  permissions: Permission[]
  signature_url?: string
}

// Tipos de módulos y acciones para permisos
export type PermissionModule = 'projects' | 'reports' | 'financial' | 'users' | 'companies' | 'bitacora'
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'sign' | 'assign'

// Interfaces para filtros
export interface ProjectFilters {
  search: string
  status: string
  interventionType: string
  clientId: string
  dateRange: {
    start: string
    end: string
  } | null
  progressRange: {
    min: number
    max: number
  } | null
}

// Interfaces para proyectos
export interface Project {
  id: string
  name: string
  description?: string
  client_company_id: string
  address: string
  city?: string
  intervention_types: InterventionType[]
  status: ProjectStatus
  budget?: number
  start_date?: string
  end_date?: string
  estimated_end_date?: string
  custom_fields_config?: Record<string, any>
  project_code?: string
  logo_url?: string
  progress_percentage: number
  last_activity_at: string
  is_archived: boolean
  estimated_duration_days?: number
  actual_duration_days?: number
  company?: {
    id: string
    name: string
    logo_url?: string
    company_type?: string
  }
  created_by?: string
  created_at: string
  updated_at: string
}

// Interfaces para miembros del proyecto
export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_in_project: 'supervisor' | 'residente' | 'ayudante' | 'especialista'
  is_active: boolean
  assigned_at: string
  assigned_by?: string
  notes?: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
}

// Interfaces para documentos del proyecto
export interface ProjectDocument {
  id: string
  project_id: string
  file_name: string
  file_url: string
  file_type: 'logo' | 'contract' | 'report' | 'photo' | 'drawing' | 'other'
  file_size?: number
  mime_type?: string
  uploaded_by: string
  uploaded_at: string
  description?: string
  is_public: boolean
  uploaded_by_user?: {
    id: string
    full_name: string
    email: string
  }
}

// Interfaces para actividades del proyecto
export interface ProjectActivity {
  id: string
  project_id: string
  user_id: string
  activity_type: 'created' | 'updated' | 'status_changed' | 'member_added' | 'member_removed' | 'document_uploaded' | 'report_generated'
  description: string
  metadata?: Record<string, any>
  created_at: string
  user?: {
    id: string
    full_name: string
    email: string
  }
}

// Interfaces para bitácoras
export interface DailyLog {
  id: string
  project_id: string
  user_id: string
  date: string
  weather: string
  personnel: string[]
  activities: string
  materials: string
  equipment: string
  observations: string
  photos: string[]
  created_at: string
  updated_at: string
}

export interface BitacoraEntry {
  id: string
  project_id: string
  entry_date: string
  weather: string
  temperature?: number
  personnel_count?: number
  activities?: Array<{
    description: string
    progress?: number
  }>
  materials?: Array<{
    name: string
    quantity: number
    unit: string
  }>
  equipment?: Array<{
    name: string
    status: string
  }>
  observations?: string
  photos?: Array<{
    url: string
    caption?: string
  }>
  status: 'draft' | 'published'
  created_by: string
  created_at: string
  updated_at: string
  created_by_user?: {
    id: string
    email: string
    profile?: {
      full_name: string
    }
  }
}

// Interfaces para reportes
export interface Report {
  id: string
  project_id: string
  title: string
  description?: string
  content?: string
  report_type: 'daily' | 'weekly' | 'monthly' | 'progress' | 'final'
  status: ReportStatus
  period_start?: string
  period_end?: string
  bitacora_entries_count?: number
  pages_count?: number
  photos_count?: number
  pdf_url?: string
  created_by: string
  approved_by?: string
  signed_by?: string
  submitted_at?: string
  approved_at?: string
  signed_at?: string
  review_comments?: string
  created_at: string
  updated_at: string
  created_by_user?: {
    id: string
    email: string
    profile?: {
      full_name: string
    }
  }
  approved_by_user?: {
    id: string
    email: string
    profile?: {
      full_name: string
    }
  }
}

// Interfaces para chat
export interface ChatMessage {
  id: string
  project_id: string
  user_id: string
  message: string
  message_type: 'text' | 'image' | 'file'
  attachment_url?: string
  created_at: string
  user?: {
    id: string
    email: string
    profile?: {
      full_name: string
      avatar_url?: string
    }
  }
}

// Interfaces para empresas
export interface Company {
  id: string
  name: string
  nit: string
  address: string
  phone?: string
  email?: string
  contact_person?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Interfaces para sistema fiduciario
export interface FiduciaryAccount {
  id: string
  project_id: string
  sifi_code: '1' | '2'
  account_name: string
  bank_name: string
  account_number: string
  initial_balance: number
  current_balance: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

export interface ProjectFinancialConfig {
  id: string
  project_id: string
  requires_construction_acts: boolean
  requires_legalizations: boolean
  approval_flow: string[]
  budget_alerts: number[]
  max_approval_amount?: number
  requires_client_approval: boolean
  auto_approve_under: number
  created_at: string
  updated_at: string
  created_by: string
}

export interface PaymentOrder {
  id: string
  project_id: string
  fiduciary_account_id?: string
  order_number: string
  description: string
  amount: number
  beneficiary_name: string
  beneficiary_document?: string
  beneficiary_account_number?: string
  beneficiary_bank?: string
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  requested_at: string
  due_date?: string
  paid_at?: string
  supporting_documents?: string[]
  invoice_number?: string
  created_at: string
  updated_at: string
  created_by: string
  
  // Relaciones
  fiduciary_account?: FiduciaryAccount
  approver?: {
    id: string
    full_name: string
    email: string
  }
}

export interface FiduciaryMovement {
  id: string
  fiduciary_account_id: string
  payment_order_id?: string
  movement_type: 'credit' | 'debit'
  amount: number
  description: string
  reference_number?: string
  balance_before: number
  balance_after: number
  created_at: string
  created_by: string
}

// Actualizar interface Project para incluir información fiduciaria
export interface ProjectWithFiduciary extends Project {
  fiduciary_accounts?: FiduciaryAccount[]
  financial_config?: ProjectFinancialConfig
  payment_orders?: PaymentOrder[]
}

// Re-exportar tipos de la base de datos
export * from './database'
