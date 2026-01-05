// Tipos extendidos para las nuevas funcionalidades
// Sistema de Métricas de Rendimiento
export interface PerformanceMetric {
  id: string
  metric_type: 'page_load_time' | 'api_response_time' | 'error_rate' | 'user_session_duration' | 'feature_usage' | 'system_health'
  metric_name: string
  value: number
  unit: string
  company_id?: string
  project_id?: string
  user_id?: string
  metadata: Record<string, any>
  created_at: string
}

// Sistema de Roles por Empresa
export interface CompanyRole {
  id: string
  company_id: string
  role_name: string
  role_display_name: string
  permissions: Record<string, boolean>
  is_default: boolean
  is_active: boolean
  created_at: string
  created_by: string
}

export interface UserCompanyPermission {
  id: string
  user_id: string
  company_id: string
  company_role_id?: string
  custom_permissions: Record<string, any>
  is_active: boolean
  assigned_at: string
  assigned_by: string
  company_role?: CompanyRole
  company?: {
    id: string
    name: string
    company_type: string
  }
}

// Configuración por Empresa
export interface CompanyConfiguration {
  id: string
  company_id: string
  parent_config_id?: string
  overrides: Record<string, any>
  is_active: boolean
  created_at: string
  created_by: string
  company?: {
    id: string
    name: string
    company_type: string
  }
  parent_config?: {
    id: string
    name: string
    company_name?: string
  }
}

// Empresa extendida con nuevas funcionalidades
export interface CompanyExtended {
  id: string
  name: string
  nit: string
  company_type: 'cliente' | 'constructora' | 'gerencia' | 'otra'
  custom_roles_enabled: boolean
  max_users: number
  branding_enabled: boolean
  subscription_plan: 'basic' | 'premium' | 'enterprise'
  logo_url?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  website?: string
  legal_representative?: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

// Dashboard de métricas para SuperAdmin
export interface PerformanceDashboard {
  total_companies: number
  total_projects: number
  total_users: number
  active_configurations: number
  metrics_summary: {
    period: string
    total_page_views: number
    average_load_time: number
    error_rate: number
    top_companies_by_usage: Array<{
      company_id: string
      company_name: string
      usage_count: number
    }>
    top_features: Array<{
      feature_name: string
      usage_count: number
    }>
  }
  company_metrics: Array<{
    company_id: string
    company_name: string
    projects_count: number
    users_count: number
    last_activity: string
    performance_score: number
  }>
}

// Tipos para permisos granulares
export type CompanyPermission =
  | 'can_manage_users'
  | 'can_manage_roles'
  | 'can_manage_branding'
  | 'can_view_analytics'
  | 'can_manage_projects'
  | 'can_approve_documents'
  | 'can_upload_documents'
  | 'can_view_reports'
  | 'can_submit_reports'
  | 'can_delete_projects'
  | 'can_export_data'

// Funciones de utilidad para verificar permisos
export interface PermissionChecker {
  hasCompanyPermission: (companyId: string, permission: CompanyPermission) => boolean
  hasProjectPermission: (projectId: string, permission: CompanyPermission) => boolean
  getUserCompanyPermissions: () => UserCompanyPermission[]
  isCompanyAdmin: (companyId: string) => boolean
  isSuperAdmin: () => boolean
}

// Configuración de métricas de frontend
export interface FrontendMetricsConfig {
  enabled: boolean
  sample_rate: number
  endpoints: {
    metrics: string
    errors: string
  }
  core_web_vitals: boolean
  user_timing: boolean
  resource_timing: boolean
}

// Alertas de rendimiento
export interface PerformanceAlert {
  id: string
  type: 'error_rate' | 'slow_response' | 'high_load' | 'system_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  company_id?: string
  project_id?: string
  threshold: number
  current_value: number
  created_at: string
  is_resolved: boolean
  resolved_at?: string
}

// Configuración de suscripción
export interface SubscriptionLimits {
  max_users: number
  max_projects: number
  max_storage_gb: number
  branding_enabled: boolean
  custom_roles_enabled: boolean
  analytics_enabled: boolean
  api_rate_limit: number
  support_level: 'basic' | 'premium' | 'enterprise'
}

export interface SubscriptionPlan {
  id: string
  name: string
  limits: SubscriptionLimits
  price_monthly: number
  price_yearly: number
  features: string[]
  is_popular?: boolean
}