'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Shield, 
  ArrowLeft, 
  Save, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Settings
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UserPermission {
  id: string
  user_id: string
  module: string
  action: string
  allowed: boolean
  project_id?: string
  granted_by?: string
  granted_at: string
}

interface RolePermission {
  id: string
  role: string
  module: string
  action: string
  allowed: boolean
}

interface PermissionMatrix {
  [module: string]: {
    [action: string]: {
      rolePermission: boolean
      customPermission?: boolean
      customPermissionId?: string
    }
  }
}

const MODULES = [
  { key: 'projects', label: 'Proyectos', description: 'Gestión de proyectos de construcción' },
  { key: 'reports', label: 'Reportes', description: 'Informes y reportes técnicos' },
  { key: 'financial', label: 'Financiero', description: 'Módulo financiero y presupuestos' },
  { key: 'users', label: 'Usuarios', description: 'Gestión de usuarios y perfiles' },
  { key: 'companies', label: 'Empresas', description: 'Gestión de empresas cliente' },
  { key: 'bitacora', label: 'Bitácora', description: 'Registro de actividades diarias' }
]

const ACTIONS = [
  { key: 'create', label: 'Crear', description: 'Crear nuevos registros' },
  { key: 'read', label: 'Leer', description: 'Ver y consultar información' },
  { key: 'update', label: 'Actualizar', description: 'Modificar registros existentes' },
  { key: 'delete', label: 'Eliminar', description: 'Eliminar registros' },
  { key: 'approve', label: 'Aprobar', description: 'Aprobar documentos y procesos' },
  { key: 'sign', label: 'Firmar', description: 'Firmar documentos oficiales' },
  { key: 'assign', label: 'Asignar', description: 'Asignar usuarios y responsabilidades' }
]

export default function UserPermissionsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  const [user, setUser] = useState<User | null>(null)
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [customPermissions, setCustomPermissions] = useState<UserPermission[]>([])
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      loadUserData()
    }
  }, [userId])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Cargar datos del usuario
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        setError('Usuario no encontrado')
        return
      }

      const user = userData as any
      setUser(user)

      // Cargar permisos del rol
      const { data: rolePerms, error: roleError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', user.role)

      if (roleError) {
        console.error('Error loading role permissions:', roleError)
      } else {
        setRolePermissions(rolePerms || [])
      }

      // Cargar permisos personalizados
      const { data: customPerms, error: customError } = await supabase
        .from('user_custom_permissions')
        .select('*')
        .eq('user_id', userId) as any

      if (customError) {
        console.error('Error loading custom permissions:', customError)
      } else {
        setCustomPermissions(customPerms || [])
      }

      // Construir matriz de permisos
      buildPermissionMatrix(rolePerms || [], customPerms || [])

    } catch (error) {
      console.error('Error:', error)
      setError('Error inesperado al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const buildPermissionMatrix = (rolePerms: RolePermission[], customPerms: UserPermission[]) => {
    const matrix: PermissionMatrix = {}

    // Inicializar matriz con permisos del rol
    MODULES.forEach(module => {
      matrix[module.key] = {}
      ACTIONS.forEach(action => {
        const rolePermission = rolePerms.find(rp => 
          rp.module === module.key && rp.action === action.key
        )
        
        matrix[module.key][action.key] = {
          rolePermission: rolePermission?.allowed || false
        }
      })
    })

    // Aplicar permisos personalizados
    customPerms.forEach(customPerm => {
      if (matrix[customPerm.module] && matrix[customPerm.module][customPerm.action]) {
        matrix[customPerm.module][customPerm.action].customPermission = customPerm.allowed
        matrix[customPerm.module][customPerm.action].customPermissionId = customPerm.id
      }
    })

    setPermissionMatrix(matrix)
  }

  const handlePermissionChange = async (module: string, action: string, allowed: boolean) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const currentPermission = permissionMatrix[module][action]
      
      if (allowed === currentPermission.rolePermission) {
        // Si el permiso personalizado es igual al del rol, eliminarlo
        if (currentPermission.customPermissionId) {
          const { error } = await supabase
            .from('user_custom_permissions')
            .delete()
            .eq('id', currentPermission.customPermissionId)

          if (error) {
            console.error('Error deleting custom permission:', error)
            setError('Error al eliminar permiso personalizado')
            return
          }
        }
      } else {
        // Crear o actualizar permiso personalizado
        if (currentPermission.customPermissionId) {
          // Actualizar permiso existente
          const updateData: any = { 
            allowed,
            granted_at: new Date().toISOString()
          }
          const { error } = await (supabase
            .from('user_custom_permissions') as any)
            .update(updateData)
            .eq('id', currentPermission.customPermissionId)

          if (error) {
            console.error('Error updating custom permission:', error)
            setError('Error al actualizar permiso')
            return
          }
        } else {
          // Crear nuevo permiso personalizado
          const insertData: any = {
            user_id: userId,
            module,
            action,
            allowed,
            granted_by: (await supabase.auth.getUser()).data.user?.id
          }
          const { error } = await (supabase
            .from('user_custom_permissions') as any)
            .insert(insertData)

          if (error) {
            console.error('Error creating custom permission:', error)
            setError('Error al crear permiso')
            return
          }
        }
      }

      // Recargar datos
      await loadUserData()
      setSuccess('Permisos actualizados correctamente')
      
    } catch (error) {
      console.error('Error:', error)
      setError('Error inesperado al actualizar permisos')
    } finally {
      setSaving(false)
    }
  }

  const resetToRolePermissions = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Eliminar todos los permisos personalizados
      const { error } = await supabase
        .from('user_custom_permissions')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Error resetting permissions:', error)
        setError('Error al resetear permisos')
        return
      }

      // Recargar datos
      await loadUserData()
      setSuccess('Permisos reseteados a los del rol')
      
    } catch (error) {
      console.error('Error:', error)
      setError('Error inesperado al resetear permisos')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="bg-gray-200 h-96 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Usuario no encontrado</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="h-8 w-8 mr-3" />
              Permisos de Usuario
            </h1>
            <p className="text-gray-600 mt-2">
              Gestiona permisos granulares para {user.full_name}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={resetToRolePermissions} disabled={saving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetear a Rol
          </Button>
          <Button onClick={() => router.push(`/admin/users/${userId}/edit`)}>
            <User className="h-4 w-4 mr-2" />
            Editar Usuario
          </Button>
        </div>
      </div>

      {/* Información del usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Información del Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>
                {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{user.full_name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-4">
                <Badge variant="outline">{user.role}</Badge>
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Matriz de permisos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Matriz de Permisos
          </CardTitle>
          <CardDescription>
            Los permisos personalizados sobrescriben los permisos del rol. 
            Los permisos del rol se muestran como referencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {MODULES.map((module) => (
              <div key={module.key} className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{module.label}</h3>
                  <p className="text-sm text-gray-600">{module.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ACTIONS.map((action) => {
                    const permission = permissionMatrix[module.key]?.[action.key]
                    const isCustomPermission = permission?.customPermission !== undefined
                    const isAllowed = isCustomPermission 
                      ? permission.customPermission 
                      : permission?.rolePermission || false

                    return (
                      <div key={action.key} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${module.key}-${action.key}`}
                            checked={isAllowed}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(module.key, action.key, checked as boolean)
                            }
                            disabled={saving}
                          />
                          <Label 
                            htmlFor={`${module.key}-${action.key}`}
                            className="text-sm font-medium"
                          >
                            {action.label}
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500 ml-6">{action.description}</p>
                        {isCustomPermission && (
                          <div className="ml-6">
                            <Badge variant="outline" className="text-xs">
                              Personalizado
                            </Badge>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                <Separator />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leyenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leyenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Permiso habilitado</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm">Permiso deshabilitado</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">Personalizado</Badge>
            <span className="text-sm">Permiso personalizado (sobrescribe el rol)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

