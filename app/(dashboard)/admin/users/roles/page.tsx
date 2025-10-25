'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Users,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

interface RolePermission {
  id: string
  role: string
  module: string
  action: string
  allowed: boolean
}

interface Role {
  name: string
  displayName: string
  description: string
  permissions: { [module: string]: { [action: string]: boolean } }
}

const MODULES = [
  { key: 'projects', label: 'Proyectos', description: 'Gestión de proyectos de construcción' },
  { key: 'reports', label: 'Reportes', description: 'Informes y reportes técnicos' },
  { key: 'financial', label: 'Financiero', description: 'Módulo financiero y presupuestos' },
  { key: 'users', label: 'Usuarios', description: 'Gestión de usuarios y perfiles' },
  { key: 'companies', label: 'Empresas', description: 'Gestión de empresas cliente' },
  { key: 'bitacora', label: 'Bitácora', description: 'Registro de actividades diarias' },
  { key: 'plantillas_pdf', label: 'Plantillas PDF', description: 'Configuración de plantillas de reportes' }
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

const DEFAULT_ROLES: Role[] = [
  {
    name: 'super_admin',
    displayName: 'Super Administrador',
    description: 'Acceso completo al sistema',
    permissions: {
      projects: { create: true, read: true, update: true, delete: true, approve: true, sign: true, assign: true },
      reports: { create: true, read: true, update: true, delete: true, approve: true, sign: true, assign: true },
      financial: { create: true, read: true, update: true, delete: true, approve: true, sign: true, assign: true },
      users: { create: true, read: true, update: true, delete: true, approve: true, sign: true, assign: true },
      companies: { create: true, read: true, update: true, delete: true, approve: true, sign: true, assign: true },
      bitacora: { create: true, read: true, update: true, delete: true, approve: true, sign: true, assign: true },
      plantillas_pdf: { create: true, read: true, update: true, delete: true, approve: true, sign: true, assign: true }
    }
  },
  {
    name: 'admin',
    displayName: 'Administrador',
    description: 'Gestión completa excepto eliminaciones críticas',
    permissions: {
      projects: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: true },
      reports: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: true },
      financial: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: true },
      users: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: true },
      companies: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: true },
      bitacora: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: true },
      plantillas_pdf: { create: true, read: true, update: true, delete: true, approve: true, sign: true, assign: true }
    }
  },
  {
    name: 'gerente',
    displayName: 'Gerente',
    description: 'Supervisión y aprobaciones',
    permissions: {
      projects: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: true },
      reports: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: false },
      financial: { create: false, read: true, update: false, delete: false, approve: true, sign: true, assign: false },
      users: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: true },
      companies: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false },
      bitacora: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: true },
      plantillas_pdf: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false }
    }
  },
  {
    name: 'supervisor',
    displayName: 'Supervisor',
    description: 'Operaciones de campo y aprobaciones',
    permissions: {
      projects: { create: false, read: true, update: true, delete: false, approve: true, sign: true, assign: false },
      reports: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: false },
      financial: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false },
      users: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false },
      companies: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false },
      bitacora: { create: true, read: true, update: true, delete: false, approve: true, sign: true, assign: false },
      plantillas_pdf: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false }
    }
  },
  {
    name: 'residente',
    displayName: 'Residente',
    description: 'Registro de bitácoras y reportes',
    permissions: {
      projects: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false },
      reports: { create: true, read: true, update: true, delete: false, approve: false, sign: false, assign: false },
      financial: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false },
      users: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false },
      companies: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false },
      bitacora: { create: true, read: true, update: true, delete: false, approve: false, sign: false, assign: false },
      plantillas_pdf: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false }
    }
  },
  {
    name: 'cliente',
    displayName: 'Cliente',
    description: 'Solo visualización de sus proyectos',
    permissions: {
      projects: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false },
      reports: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false },
      financial: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false },
      users: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false },
      companies: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false },
      bitacora: { create: false, read: true, update: false, delete: false, approve: false, sign: false, assign: false },
      plantillas_pdf: { create: false, read: false, update: false, delete: false, approve: false, sign: false, assign: false }
    }
  }
]

export default function RolesManagementPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES)
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState<{ [role: string]: boolean }>({})
  
  const supabase = createClient()

  useEffect(() => {
    loadRolePermissions()
  }, [])

  const loadRolePermissions = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role, module, action')

      if (error) {
        console.error('Error loading role permissions:', error)
        setError('Error al cargar permisos de roles')
        return
      }

      setRolePermissions(data || [])
      
      // Construir roles con permisos desde la base de datos
      const rolesWithPermissions = DEFAULT_ROLES.map(role => {
        const permissions: { [module: string]: { [action: string]: boolean } } = {}
        
        MODULES.forEach(module => {
          permissions[module.key] = {}
          ACTIONS.forEach(action => {
            const permission = (data as any)?.find((rp: any) => 
              rp.role === role.name && 
              rp.module === module.key && 
              rp.action === action.key
            )
            permissions[module.key][action.key] = permission?.allowed || false
          })
        })
        
        return {
          ...role,
          permissions
        }
      })
      
      setRoles(rolesWithPermissions)
      
    } catch (error) {
      console.error('Error:', error)
      setError('Error inesperado al cargar roles')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (roleName: string, module: string, action: string, allowed: boolean) => {
    setRoles(prevRoles => 
      prevRoles.map(role => 
        role.name === roleName 
          ? {
              ...role,
              permissions: {
                ...role.permissions,
                [module]: {
                  ...role.permissions[module],
                  [action]: allowed
                }
              }
            }
          : role
      )
    )
  }

  const saveRolePermissions = async (roleName: string) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const role = roles.find(r => r.name === roleName)
      if (!role) return

      // Eliminar permisos existentes del rol
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role', roleName)

      if (deleteError) {
        console.error('Error deleting role permissions:', deleteError)
        setError('Error al eliminar permisos existentes')
        return
      }

      // Insertar nuevos permisos
      const permissionsToInsert: Array<{
        role: string
        module: string
        action: string
        allowed: boolean
      }> = []
      
      MODULES.forEach(module => {
        ACTIONS.forEach(action => {
          permissionsToInsert.push({
            role: roleName,
            module: module.key,
            action: action.key,
            allowed: role.permissions[module.key]?.[action.key] || false
          })
        })
      })

      const { error: insertError } = await (supabase
        .from('role_permissions') as any)
        .insert(permissionsToInsert)

      if (insertError) {
        console.error('Error inserting role permissions:', insertError)
        setError('Error al guardar permisos')
        return
      }

      setSuccess(`Permisos del rol ${role.displayName} actualizados correctamente`)
      setEditingRole(null)
      
      // Recargar datos
      await loadRolePermissions()
      
    } catch (error) {
      console.error('Error:', error)
      setError('Error inesperado al guardar permisos')
    } finally {
      setSaving(false)
    }
  }

  const toggleShowPermissions = (roleName: string) => {
    setShowPermissions(prev => ({
      ...prev,
      [roleName]: !prev[roleName]
    }))
  }

  const getPermissionCount = (role: Role) => {
    let count = 0
    MODULES.forEach(module => {
      ACTIONS.forEach(action => {
        if (role.permissions[module.key]?.[action.key]) {
          count++
        }
      })
    })
    return count
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
            ))}
          </div>
        </div>
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
              Gestión de Roles
            </h1>
            <p className="text-gray-600 mt-2">
              Configura permisos por rol en el sistema
            </p>
          </div>
        </div>
      </div>

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

      {/* Lista de roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.name} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{role.displayName}</CardTitle>
                  <CardDescription className="mt-1">{role.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleShowPermissions(role.name)}>
                      {showPermissions[role.name] ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Ocultar Permisos
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Permisos
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingRole(role.name)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Permisos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Permisos activos:</span>
                <Badge variant="outline">{getPermissionCount(role)}</Badge>
              </div>
              
              {showPermissions[role.name] && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Permisos por módulo:</h4>
                  {MODULES.map(module => {
                    const modulePermissions = Object.values(role.permissions[module.key] || {})
                    const activeCount = modulePermissions.filter(Boolean).length
                    return (
                      <div key={module.key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{module.label}:</span>
                        <span className="font-medium">{activeCount}/{ACTIONS.length}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {editingRole === role.name && (
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="text-sm font-medium">Editar Permisos:</h4>
                  {MODULES.map(module => (
                    <div key={module.key} className="space-y-1">
                      <Label className="text-xs font-medium">{module.label}</Label>
                      <div className="grid grid-cols-2 gap-1">
                        {ACTIONS.map(action => (
                          <div key={action.key} className="flex items-center space-x-1">
                            <Switch
                              checked={role.permissions[module.key]?.[action.key] || false}
                              onCheckedChange={(checked) => 
                                togglePermission(role.name, module.key, action.key, checked)
                              }
                              disabled={saving}
                              className="scale-75"
                            />
                            <Label className="text-xs">{action.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => saveRolePermissions(role.name)}
                      disabled={saving}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Guardar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditingRole(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información sobre Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Jerarquía de Roles:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>1. <strong>Super Admin</strong> - Acceso completo</li>
                <li>2. <strong>Admin</strong> - Gestión completa</li>
                <li>3. <strong>Gerente</strong> - Supervisión</li>
                <li>4. <strong>Supervisor</strong> - Operaciones</li>
                <li>5. <strong>Residente</strong> - Registro</li>
                <li>6. <strong>Cliente</strong> - Visualización</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Permisos Personalizados:</h4>
              <p className="text-sm text-gray-600">
                Los usuarios pueden tener permisos adicionales específicos que sobrescriben 
                los permisos de su rol. Estos se gestionan individualmente en la sección de usuarios.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

