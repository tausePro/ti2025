'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  UserCog, 
  ArrowLeft, 
  Save, 
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Phone,
  Shield,
  FileText,
  Trash2
} from 'lucide-react'

interface UserFormData {
  email: string
  full_name: string
  phone: string
  role: string
  professional_license: string
  is_active: boolean
}

const ROLES = [
  { value: 'super_admin', label: 'Super Administrador', description: 'Acceso completo al sistema' },
  { value: 'admin', label: 'Administrador', description: 'Gestión completa excepto eliminaciones críticas' },
  { value: 'gerente', label: 'Gerente', description: 'Supervisión y aprobaciones' },
  { value: 'supervisor', label: 'Supervisor', description: 'Operaciones de campo y aprobaciones' },
  { value: 'residente', label: 'Residente', description: 'Registro de bitácoras e informes' },
  { value: 'cliente', label: 'Cliente', description: 'Solo visualización de sus proyectos' }
]

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    phone: '',
    role: 'residente',
    professional_license: '',
    is_active: true
  })
  const [originalData, setOriginalData] = useState<UserFormData | null>(null)
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

      const userFormData: UserFormData = {
        email: user.email,
        full_name: user.full_name,
        phone: user.phone || '',
        role: user.role,
        professional_license: user.professional_license || '',
        is_active: user.is_active
      }

      setFormData(userFormData)
      setOriginalData(userFormData)

    } catch (error) {
      console.error('Error:', error)
      setError('Error inesperado al cargar datos del usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.email.trim()) {
      return 'El email es requerido'
    }
    if (!formData.full_name.trim()) {
      return 'El nombre completo es requerido'
    }
    if (!formData.role) {
      return 'El rol es requerido'
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return 'El formato del email no es válido'
    }
    
    return null
  }

  const hasChanges = () => {
    if (!originalData) return false
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!hasChanges()) {
      setError('No hay cambios para guardar')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Usar la API route para actualizar el usuario
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          ...formData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al actualizar usuario')
        return
      }

      setSuccess('Usuario actualizado exitosamente')
      setOriginalData({ ...formData })
      
      // Recargar datos después de un momento
      setTimeout(() => {
        loadUserData()
      }, 1000)

    } catch (error) {
      console.error('Error:', error)
      setError('Error inesperado al actualizar usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Usar la API route para eliminar el usuario
      const response = await fetch(`/api/users/delete?id=${userId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al eliminar usuario')
        return
      }

      if (result.warning) {
        setError(result.warning)
      } else {
        setSuccess('Usuario eliminado exitosamente')
      }
      
      // Redirigir después de un momento
      setTimeout(() => {
        router.push('/admin/users')
      }, 2000)

    } catch (error) {
      console.error('Error:', error)
      setError('Error inesperado al eliminar usuario')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-200 h-96 rounded-lg"></div>
            <div className="bg-gray-200 h-96 rounded-lg"></div>
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
              <UserCog className="h-8 w-8 mr-3" />
              Editar Usuario
            </h1>
            <p className="text-gray-600 mt-2">
              Modificar información del usuario
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/users/${userId}/permissions`)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Permisos
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={saving}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
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

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información Básica
              </CardTitle>
              <CardDescription>
                Datos personales del usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="full_name"
                    placeholder="Juan Pérez"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    placeholder="+52 55 1234 5678"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="professional_license">Licencia Profesional</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="professional_license"
                    placeholder="12345678"
                    value={formData.professional_license}
                    onChange={(e) => handleInputChange('professional_license', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración del sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Configuración del Sistema
              </CardTitle>
              <CardDescription>
                Rol y estado del usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-sm text-gray-500">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">Estado del Usuario</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">
                    {formData.is_active ? 'Usuario Activo' : 'Usuario Inactivo'}
                  </Label>
                </div>
                <p className="text-sm text-gray-500">
                  Los usuarios inactivos no pueden acceder al sistema
                </p>
              </div>

              {/* Información adicional */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Cambios de Rol</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Al cambiar el rol, los permisos personalizados se mantienen</li>
                  <li>• Los nuevos permisos del rol se aplicarán automáticamente</li>
                  <li>• Revisa los permisos después de cambiar el rol</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !hasChanges()}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

