'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { RefreshCw, User, Shield, Key } from 'lucide-react'

export function UserDebugInfo() {
  const { user, profile, loading, signOut } = useAuth()
  const { hasPermission, getUserPermissions } = usePermissions()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debug Info - Cargando...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  const permissions = getUserPermissions()

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Debug Info - Usuario Actual
        </CardTitle>
        <CardDescription>
          Información detallada del usuario y permisos para debugging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usuario de Auth */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Usuario de Autenticación
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ID:</p>
                <p className="font-mono text-sm">{user?.id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email:</p>
                <p className="font-mono text-sm">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Creado:</p>
                <p className="font-mono text-sm">{user?.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Último acceso:</p>
                <p className="font-mono text-sm">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Perfil */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Perfil de Usuario
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ID:</p>
                <p className="font-mono text-sm">{profile?.id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email:</p>
                <p className="font-mono text-sm">{profile?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nombre:</p>
                <p className="font-mono text-sm">{profile?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rol:</p>
                <Badge variant={profile?.role === 'super_admin' ? 'default' : 'secondary'}>
                  {profile?.role || 'N/A'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Activo:</p>
                <Badge variant={profile?.is_active ? 'default' : 'destructive'}>
                  {profile?.is_active ? 'Sí' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Creado:</p>
                <p className="font-mono text-sm">{profile?.created_at ? new Date(profile.created_at).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Permisos */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Key className="h-4 w-4" />
            Permisos del Usuario
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {permissions.map((perm, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="text-sm font-medium">{perm.module}</p>
                    <p className="text-xs text-gray-500">{perm.action}</p>
                  </div>
                  <Badge variant={perm.allowed ? 'default' : 'destructive'} className="text-xs">
                    {perm.allowed ? 'Sí' : 'No'}
                  </Badge>
                </div>
              ))}
            </div>
            {permissions.length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay permisos cargados</p>
            )}
          </div>
        </div>

        {/* Pruebas de Permisos */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Pruebas de Permisos</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Super Admin Dashboard:</p>
                <Badge variant={hasPermission('projects', 'create') ? 'default' : 'destructive'}>
                  {hasPermission('projects', 'create') ? 'Acceso Permitido' : 'Acceso Denegado'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Crear Proyectos:</p>
                <Badge variant={hasPermission('projects', 'create') ? 'default' : 'destructive'}>
                  {hasPermission('projects', 'create') ? 'Permitido' : 'Denegado'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Leer Reportes:</p>
                <Badge variant={hasPermission('reports', 'read') ? 'default' : 'destructive'}>
                  {hasPermission('reports', 'read') ? 'Permitido' : 'Denegado'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gestionar Usuarios:</p>
                <Badge variant={hasPermission('users', 'create') ? 'default' : 'destructive'}>
                  {hasPermission('users', 'create') ? 'Permitido' : 'Denegado'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar Página
          </Button>
          <Button variant="outline" onClick={signOut}>
            Cerrar Sesión
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}