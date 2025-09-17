export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'super_admin' | 'admin' | 'gerente' | 'supervisor' | 'residente' | 'cliente'
          company_id?: string
          phone?: string
          professional_license?: string
          is_active: boolean
          created_at: string
          updated_at: string
          signature_url?: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'super_admin' | 'admin' | 'gerente' | 'supervisor' | 'residente' | 'cliente'
          company_id?: string
          phone?: string
          professional_license?: string
          is_active?: boolean
          signature_url?: string
        }
        Update: {
          email?: string
          full_name?: string
          role?: 'super_admin' | 'admin' | 'gerente' | 'supervisor' | 'residente' | 'cliente'
          company_id?: string
          phone?: string
          professional_license?: string
          is_active?: boolean
          signature_url?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role: string
          module: 'projects' | 'reports' | 'financial' | 'users' | 'companies' | 'bitacora'
          action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'sign' | 'assign'
          allowed: boolean
        }
        Insert: {
          role: string
          module: 'projects' | 'reports' | 'financial' | 'users' | 'companies' | 'bitacora'
          action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'sign' | 'assign'
          allowed: boolean
        }
        Update: {
          role?: string
          module?: 'projects' | 'reports' | 'financial' | 'users' | 'companies' | 'bitacora'
          action?: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'sign' | 'assign'
          allowed?: boolean
        }
      }
      user_custom_permissions: {
        Row: {
          id: string
          user_id: string
          module: 'projects' | 'reports' | 'financial' | 'users' | 'companies' | 'bitacora'
          action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'sign' | 'assign'
          allowed: boolean
          project_id?: string
          granted_by?: string
          granted_at: string
        }
        Insert: {
          user_id: string
          module: 'projects' | 'reports' | 'financial' | 'users' | 'companies' | 'bitacora'
          action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'sign' | 'assign'
          allowed: boolean
          project_id?: string
          granted_by?: string
        }
        Update: {
          allowed?: boolean
          granted_by?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          nit: string
          company_type?: 'cliente' | 'constructora' | 'interventora' | 'supervisora'
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
        Insert: {
          name: string
          nit: string
          company_type?: 'cliente' | 'constructora' | 'interventora' | 'supervisora'
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
          is_active?: boolean
          created_by?: string
        }
        Update: {
          name?: string
          nit?: string
          company_type?: 'cliente' | 'constructora' | 'interventora' | 'supervisora'
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
          is_active?: boolean
        }
      }
      projects: {
        Row: {
          id: string
          company_id: string
          name: string
          code?: string
          project_code?: string
          address: string
          city?: string
          intervention_types: ('supervision_tecnica' | 'interventoria_administrativa')[]
          status: 'planificacion' | 'activo' | 'pausado' | 'finalizado'
          start_date?: string
          end_date?: string
          custom_fields_config: Record<string, any> | null
          created_by?: string
          created_at: string
          updated_at: string
          logo_url?: string
          progress_percentage: number
          last_activity_at: string
          is_archived: boolean
          budget?: number
          description?: string
          estimated_duration_days?: number
          actual_duration_days?: number
        }
        Insert: {
          company_id: string
          name: string
          code?: string
          project_code?: string
          address: string
          city?: string
          intervention_types: ('supervision_tecnica' | 'interventoria_administrativa')[]
          status?: 'planificacion' | 'activo' | 'pausado' | 'finalizado'
          start_date?: string
          end_date?: string
          custom_fields_config?: Record<string, any> | null
          created_by?: string
          logo_url?: string
          progress_percentage?: number
          last_activity_at?: string
          is_archived?: boolean
          budget?: number
          description?: string
          estimated_duration_days?: number
          actual_duration_days?: number
        }
        Update: {
          company_id?: string
          name?: string
          code?: string
          project_code?: string
          address?: string
          city?: string
          intervention_type?: ('supervision_tecnica' | 'interventoria_administrativa')[]
          status?: 'planificacion' | 'activo' | 'pausado' | 'finalizado'
          start_date?: string
          end_date?: string
          custom_fields_config?: Record<string, any> | null
          logo_url?: string
          progress_percentage?: number
          last_activity_at?: string
          is_archived?: boolean
          budget?: number
          description?: string
          estimated_duration_days?: number
          actual_duration_days?: number
        }
      }
      project_members: {
        Row: {
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
        }
        Insert: {
          project_id: string
          user_id: string
          role_in_project: 'supervisor' | 'residente' | 'ayudante' | 'especialista'
          is_active?: boolean
          assigned_by?: string
          notes?: string
        }
        Update: {
          role_in_project?: 'supervisor' | 'residente' | 'ayudante' | 'especialista'
          is_active?: boolean
          notes?: string
        }
      }
      project_documents: {
        Row: {
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
        }
        Insert: {
          project_id: string
          file_name: string
          file_url: string
          file_type: 'logo' | 'contract' | 'report' | 'photo' | 'drawing' | 'other'
          file_size?: number
          mime_type?: string
          uploaded_by: string
          description?: string
          is_public?: boolean
        }
        Update: {
          file_name?: string
          description?: string
          is_public?: boolean
        }
      }
      project_activities: {
        Row: {
          id: string
          project_id: string
          user_id: string
          activity_type: 'created' | 'updated' | 'status_changed' | 'member_added' | 'member_removed' | 'document_uploaded' | 'report_generated'
          description: string
          metadata?: Record<string, any>
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          activity_type: 'created' | 'updated' | 'status_changed' | 'member_added' | 'member_removed' | 'document_uploaded' | 'report_generated'
          description: string
          metadata?: Record<string, any>
        }
        Update: {
          description?: string
          metadata?: Record<string, any>
        }
      }
      daily_logs: {
        Row: {
          id: string
          project_id: string
          user_id: string
          date: string
          weather: string | null
          personnel_count: number | null
          activities: Record<string, any> | null
          materials: Record<string, any> | null
          equipment: Record<string, any> | null
          observations: string | null
          custom_fields: Record<string, any> | null
          synced: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          date: string
          weather?: string | null
          personnel_count?: number | null
          activities?: Record<string, any> | null
          materials?: Record<string, any> | null
          equipment?: Record<string, any> | null
          observations?: string | null
          custom_fields?: Record<string, any> | null
          synced?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          date?: string
          weather?: string | null
          personnel_count?: number | null
          activities?: Record<string, any> | null
          materials?: Record<string, any> | null
          equipment?: Record<string, any> | null
          observations?: string | null
          custom_fields?: Record<string, any> | null
          synced?: boolean
          created_at?: string
        }
      }
      daily_log_photos: {
        Row: {
          id: string
          daily_log_id: string
          url: string
          tag: string | null
          caption: string | null
          metadata: Record<string, any> | null
        }
        Insert: {
          id?: string
          daily_log_id: string
          url: string
          tag?: string | null
          caption?: string | null
          metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          daily_log_id?: string
          url?: string
          tag?: string | null
          caption?: string | null
          metadata?: Record<string, any> | null
        }
      }
      reports: {
        Row: {
          id: string
          project_id: string
          report_type: 'quincenal' | 'mensual'
          period_start: string
          period_end: string
          status: 'borrador' | 'revision' | 'aprobado' | 'firmado'
          content: Record<string, any> | null
          pdf_url: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          report_type: 'quincenal' | 'mensual'
          period_start: string
          period_end: string
          status?: 'borrador' | 'revision' | 'aprobado' | 'firmado'
          content?: Record<string, any> | null
          pdf_url?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          report_type?: 'quincenal' | 'mensual'
          period_start?: string
          period_end?: string
          status?: 'borrador' | 'revision' | 'aprobado' | 'firmado'
          content?: Record<string, any> | null
          pdf_url?: string | null
          created_by?: string
          created_at?: string
        }
      }
      report_signatures: {
        Row: {
          id: string
          report_id: string
          user_id: string
          role: string
          signed_at: string | null
          signature_applied: boolean
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          role: string
          signed_at?: string | null
          signature_applied?: boolean
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          role?: string
          signed_at?: string | null
          signature_applied?: boolean
        }
      }
      fiduciary_accounts: {
        Row: {
          id: string
          project_id: string
          sifi_code: string
          total_budget: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          sifi_code: string
          total_budget: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          sifi_code?: string
          total_budget?: number
          created_at?: string
        }
      }
      payment_orders: {
        Row: {
          id: string
          fiduciary_account_id: string
          op_number: string
          amount: number
          concept: string
          beneficiary: string
          status: 'aprobada' | 'anulada'
          date: string
          construction_act_id: string | null
        }
        Insert: {
          id?: string
          fiduciary_account_id: string
          op_number: string
          amount: number
          concept: string
          beneficiary: string
          status?: 'aprobada' | 'anulada'
          date: string
          construction_act_id?: string | null
        }
        Update: {
          id?: string
          fiduciary_account_id?: string
          op_number?: string
          amount?: number
          concept?: string
          beneficiary?: string
          status?: 'aprobada' | 'anulada'
          date?: string
          construction_act_id?: string | null
        }
      }
      construction_acts: {
        Row: {
          id: string
          project_id: string
          act_number: string
          amount: number
          accumulated_amount: number
          date: string
          attachments: Record<string, any> | null
          observations: string | null
        }
        Insert: {
          id?: string
          project_id: string
          act_number: string
          amount: number
          accumulated_amount: number
          date: string
          attachments?: Record<string, any> | null
          observations?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          act_number?: string
          amount?: number
          accumulated_amount?: number
          date?: string
          attachments?: Record<string, any> | null
          observations?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          project_id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          content: string
          data: Record<string, any> | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          content: string
          data?: Record<string, any> | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          content?: string
          data?: Record<string, any> | null
          read?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Tipos para el sistema de permisos granulares
export type UserRole = 'super_admin' | 'admin' | 'gerente' | 'supervisor' | 'residente' | 'cliente'
export type PermissionModule = 'projects' | 'reports' | 'financial' | 'users' | 'companies' | 'bitacora'
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'sign' | 'assign'
export type RoleInProject = 'supervisor' | 'residente' | 'apoyo' | 'cliente'

export interface UserPermission {
  module: PermissionModule
  action: PermissionAction
  allowed: boolean
  source: 'role' | 'custom'
  projectId?: string
}

export interface PermissionCheck {
  hasPermission: (module: PermissionModule, action: PermissionAction, projectId?: string) => boolean
  getUserPermissions: () => UserPermission[]
  isLoading: boolean
}

// Tipos de usuario extendido
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

// Tipos de miembros de proyecto
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type ProjectMemberInsert = Database['public']['Tables']['project_members']['Insert']
export type ProjectMemberUpdate = Database['public']['Tables']['project_members']['Update']

// Tipos de permisos
export type RolePermission = Database['public']['Tables']['role_permissions']['Row']
export type UserCustomPermission = Database['public']['Tables']['user_custom_permissions']['Row']
export type ProjectStatus = 'activo' | 'pausado' | 'finalizado'
export type InterventionType = 'tecnica' | 'administrativa'
export type ReportType = 'quincenal' | 'mensual'
export type ReportStatus = 'borrador' | 'revision' | 'aprobado' | 'firmado'
