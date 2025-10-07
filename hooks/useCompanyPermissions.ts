import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CompanyRole,
  UserCompanyPermission,
  CompanyPermission,
  PermissionChecker
} from '@/types/database-extended'
import { useAuth } from '@/contexts/AuthContext'

export function useCompanyPermissions() {
  const supabase = createClient()
  const { user } = useAuth()
  const [companyPermissions, setCompanyPermissions] = useState<UserCompanyPermission[]>([])
  const [companyRoles, setCompanyRoles] = useState<CompanyRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserCompanyPermissions = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .rpc('get_user_company_permissions', { user_uuid: user.id })

      if (error) throw error
      setCompanyPermissions(data || [])
    } catch (err) {
      console.error('Error loading company permissions:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar permisos de empresa')
    } finally {
      setLoading(false)
    }
  }

  const loadCompanyRoles = async (companyId?: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('company_roles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query

      if (error) throw error
      setCompanyRoles(data || [])
    } catch (err) {
      console.error('Error loading company roles:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar roles de empresa')
    } finally {
      setLoading(false)
    }
  }

  const hasCompanyPermission = (companyId: string, permission: CompanyPermission): boolean => {
    const companyPermission = companyPermissions.find(cp => cp.company_id === companyId)
    if (!companyPermission) return false

    // Verificar permisos del rol
    if (companyPermission.company_role?.permissions?.[permission]) {
      return true
    }

    // Verificar permisos personalizados
    if (companyPermission.custom_permissions?.[permission]) {
      return true
    }

    return false
  }

  const hasProjectPermission = (projectId: string, permission: CompanyPermission): boolean => {
    // Por ahora, usar la misma lógica que company permission
    // TODO: Implementar lógica específica por proyecto
    return hasCompanyPermission(projectId, permission)
  }

  const isCompanyAdmin = (companyId: string): boolean => {
    return hasCompanyPermission(companyId, 'can_manage_users')
  }

  const isSuperAdmin = (): boolean => {
    return user?.role === 'super_admin'
  }

  const assignUserToCompany = async (
    userId: string,
    companyId: string,
    roleId?: string,
    customPermissions?: Record<string, any>
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { error } = await supabase
        .from('user_company_permissions')
        .upsert({
          user_id: userId,
          company_id: companyId,
          company_role_id: roleId,
          custom_permissions: customPermissions || {},
          assigned_by: user.id
        })

      if (error) throw error

      // Recargar permisos
      await loadUserCompanyPermissions()
    } catch (err) {
      console.error('Error assigning user to company:', err)
      throw err
    }
  }

  const removeUserFromCompany = async (userId: string, companyId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { error } = await supabase
        .from('user_company_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId)

      if (error) throw error

      // Recargar permisos
      await loadUserCompanyPermissions()
    } catch (err) {
      console.error('Error removing user from company:', err)
      throw err
    }
  }

  const createCompanyRole = async (
    companyId: string,
    roleName: string,
    roleDisplayName: string,
    permissions: Record<string, boolean>
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data, error } = await supabase
        .from('company_roles')
        .insert({
          company_id: companyId,
          role_name: roleName,
          role_display_name: roleDisplayName,
          permissions,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Recargar roles
      await loadCompanyRoles(companyId)
      return data
    } catch (err) {
      console.error('Error creating company role:', err)
      throw err
    }
  }

  const updateCompanyRole = async (
    roleId: string,
    updates: Partial<Pick<CompanyRole, 'role_display_name' | 'permissions' | 'is_active'>>
  ) => {
    try {
      const { data, error } = await supabase
        .from('company_roles')
        .update(updates)
        .eq('id', roleId)
        .select()
        .single()

      if (error) throw error

      // Recargar roles
      await loadCompanyRoles()
      return data
    } catch (err) {
      console.error('Error updating company role:', err)
      throw err
    }
  }

  const deleteCompanyRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('company_roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error

      // Recargar roles
      await loadCompanyRoles()
    } catch (err) {
      console.error('Error deleting company role:', err)
      throw err
    }
  }

  const getAvailablePermissions = (): CompanyPermission[] => {
    return [
      'can_manage_users',
      'can_manage_roles',
      'can_manage_branding',
      'can_view_analytics',
      'can_manage_projects',
      'can_approve_documents',
      'can_upload_documents',
      'can_view_reports',
      'can_submit_reports',
      'can_delete_projects',
      'can_export_data'
    ]
  }

  const getPermissionDescription = (permission: CompanyPermission): string => {
    const descriptions: Record<CompanyPermission, string> = {
      'can_manage_users': 'Gestionar usuarios de la empresa',
      'can_manage_roles': 'Crear y modificar roles',
      'can_manage_branding': 'Personalizar apariencia de la empresa',
      'can_view_analytics': 'Ver estadísticas y reportes',
      'can_manage_projects': 'Crear y editar proyectos',
      'can_approve_documents': 'Aprobar documentos y reportes',
      'can_upload_documents': 'Subir documentos',
      'can_view_reports': 'Ver reportes de proyectos',
      'can_submit_reports': 'Enviar reportes',
      'can_delete_projects': 'Eliminar proyectos',
      'can_export_data': 'Exportar datos'
    }
    return descriptions[permission] || permission
  }

  const permissionChecker: PermissionChecker = {
    hasCompanyPermission,
    hasProjectPermission,
    getUserCompanyPermissions: () => companyPermissions,
    isCompanyAdmin,
    isSuperAdmin
  }

  useEffect(() => {
    if (user) {
      loadUserCompanyPermissions()
    }
  }, [user])

  return {
    companyPermissions,
    companyRoles,
    loading,
    error,
    permissionChecker,
    loadUserCompanyPermissions,
    loadCompanyRoles,
    assignUserToCompany,
    removeUserFromCompany,
    createCompanyRole,
    updateCompanyRole,
    deleteCompanyRole,
    getAvailablePermissions,
    getPermissionDescription,
    refreshPermissions: loadUserCompanyPermissions
  }
}