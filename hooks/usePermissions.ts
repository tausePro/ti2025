import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { UserPermission, PermissionModule, PermissionAction, PermissionCheck } from '@/types'

export function usePermissions(): PermissionCheck {
  const { profile, hasPermission: authHasPermission } = useAuth()
  const [customPermissions, setCustomPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (profile?.id) {
      loadCustomPermissions()
    }
  }, [profile?.id])

  const loadCustomPermissions = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('user_custom_permissions')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('allowed', true)

      if (error) {
        console.error('Error loading custom permissions:', error)
      } else {
        setCustomPermissions(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (module: PermissionModule, action: PermissionAction, projectId?: string): boolean => {
    console.log('🔍 DEBUG usePermissions - hasPermission llamado:', {
      module,
      action,
      projectId,
      profile: profile ? { id: profile.id, email: profile.email, role: profile.role } : null
    })

    // Si no hay perfil, no hay permisos
    if (!profile) {
      console.log('🔍 DEBUG usePermissions - No hay perfil, retornando false')
      return false
    }

    // Si es super_admin, tiene todos los permisos
    if (profile.role === 'super_admin') {
      console.log('🔍 DEBUG usePermissions - Usuario es super_admin, retornando true')
      return true
    }

    // Verificar permisos personalizados primero
    const customPermission = customPermissions.find(cp => 
      cp.module === module && 
      cp.action === action && 
      (projectId ? (cp as any).project_id === projectId : !(cp as any).project_id)
    )

    if (customPermission !== undefined) {
      console.log('🔍 DEBUG usePermissions - Permiso personalizado encontrado:', customPermission.allowed)
      return customPermission.allowed
    }

    // Usar el sistema de permisos del contexto de autenticación (permisos del rol)
    const result = authHasPermission(module, action)
    console.log('🔍 DEBUG usePermissions - Resultado de authHasPermission:', result)
    return result
  }

  const getUserPermissions = (): UserPermission[] => {
    // Si no hay perfil, no hay permisos
    if (!profile) return []

    // Si es super_admin, tiene todos los permisos
    if (profile.role === 'super_admin') {
      return [
        { module: 'projects' as const, action: 'create' as const, allowed: true, source: 'role' as const },
        { module: 'projects' as const, action: 'read' as const, allowed: true, source: 'role' as const },
        { module: 'projects' as const, action: 'update' as const, allowed: true, source: 'role' as const },
        { module: 'projects' as const, action: 'delete' as const, allowed: true, source: 'role' as const },
        { module: 'reports' as const, action: 'create' as const, allowed: true, source: 'role' as const },
        { module: 'reports' as const, action: 'read' as const, allowed: true, source: 'role' as const },
        { module: 'companies' as const, action: 'create' as const, allowed: true, source: 'role' as const },
        { module: 'companies' as const, action: 'read' as const, allowed: true, source: 'role' as const },
        { module: 'users' as const, action: 'create' as const, allowed: true, source: 'role' as const },
        { module: 'users' as const, action: 'read' as const, allowed: true, source: 'role' as const },
        { module: 'bitacora' as const, action: 'create' as const, allowed: true, source: 'role' as const },
        { module: 'bitacora' as const, action: 'read' as const, allowed: true, source: 'role' as const },
        { module: 'financial' as const, action: 'create' as const, allowed: true, source: 'role' as const },
        { module: 'financial' as const, action: 'read' as const, allowed: true, source: 'role' as const }
      ]
    }

    // Combinar permisos del rol con permisos personalizados
    const rolePermissions: UserPermission[] = [
      { module: 'projects' as const, action: 'read' as const, allowed: true, source: 'role' as const },
      { module: 'reports' as const, action: 'read' as const, allowed: true, source: 'role' as const },
      { module: 'companies' as const, action: 'read' as const, allowed: true, source: 'role' as const },
      { module: 'bitacora' as const, action: 'read' as const, allowed: true, source: 'role' as const }
    ]

    // Agregar permisos personalizados
    const customPerms: UserPermission[] = customPermissions.map(cp => ({
      module: cp.module as PermissionModule,
      action: cp.action as PermissionAction,
      allowed: cp.allowed,
      source: 'custom' as const,
      projectId: (cp as any).project_id
    }))

    return [...rolePermissions, ...customPerms]
  }

  const refreshPermissions = () => {
    if (profile?.id) {
      loadCustomPermissions()
    }
  }

  return {
    hasPermission,
    getUserPermissions,
    isLoading: loading,
    refreshPermissions
  }
}
