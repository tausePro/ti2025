export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Helper type para cualquier tabla
export type AnyTable = {
  Row: Record<string, any>
  Insert: Record<string, any>
  Update: Record<string, any>
}

export interface Database {
  public: {
    Tables: {
      [key: string]: AnyTable
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: string
          avatar_url: string | null
          professional_license: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role: string
          avatar_url?: string | null
          professional_license?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: string
          avatar_url?: string | null
          professional_license?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role: string
          module: string
          action: string
          allowed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          role: string
          module: string
          action: string
          allowed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          role?: string
          module?: string
          action?: string
          allowed?: boolean
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          project_code: string
          client_company_id: string
          address: string
          city: string
          intervention_types: string[]
          status: string
          budget: number | null
          start_date: string | null
          end_date: string | null
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          project_code?: string
          client_company_id: string
          address: string
          city?: string
          intervention_types: string[]
          status?: string
          budget?: number | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          project_code?: string
          client_company_id?: string
          address?: string
          city?: string
          intervention_types?: string[]
          status?: string
          budget?: number | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role_in_project: string
          assigned_by: string
          assigned_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role_in_project: string
          assigned_by: string
          assigned_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role_in_project?: string
          assigned_by?: string
          assigned_at?: string
          is_active?: boolean
        }
      }
      project_documents: {
        Row: {
          id: string
          project_id: string
          file_name: string
          file_url: string
          file_type: string
          file_size: number
          mime_type: string
          uploaded_by: string
          uploaded_at: string
          description: string | null
          is_public: boolean
        }
        Insert: {
          id?: string
          project_id: string
          file_name: string
          file_url: string
          file_type: string
          file_size: number
          mime_type: string
          uploaded_by: string
          uploaded_at?: string
          description?: string | null
          is_public?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          file_name?: string
          file_url?: string
          file_type?: string
          file_size?: number
          mime_type?: string
          uploaded_by?: string
          uploaded_at?: string
          description?: string | null
          is_public?: boolean
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          nit: string | null
          company_type: string
          address: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          nit?: string | null
          company_type: string
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          nit?: string | null
          company_type?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
