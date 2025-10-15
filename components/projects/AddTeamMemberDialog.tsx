'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle, Search, Users, UserPlus } from 'lucide-react'
import { logger } from '@/lib/logger'
import Link from 'next/link'

interface AddTeamMemberDialogProps {
  projectId: string
  onClose: () => void
  onMemberAdded: () => void
}

interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  avatar_url?: string
  role: string
}

const ROLE_OPTIONS = [
  { value: 'supervisor', label: 'Supervisor', description: 'Supervisa y coordina el proyecto' },
  { value: 'residente', label: 'Residente', description: 'Residente de obra - Ejecuta y registra actividades diarias' },
]

export function AddTeamMemberDialog({ projectId, onClose, onMemberAdded }: AddTeamMemberDialogProps) {
  const { profile } = useAuth()
  const supabase = createClient()

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadAvailableUsers()
  }, [projectId])

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchTerm, users])

  const loadAvailableUsers = async () => {
    try {
      setLoading(true)

      // Obtener usuarios que NO están en el proyecto
      const { data: currentMembers } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('is_active', true)

      const currentMemberIds = currentMembers?.map((m: any) => m.user_id) || []

      // Obtener todos los usuarios activos
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, role')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error

      // Filtrar usuarios que no están en el proyecto
      const availableUsers = allUsers?.filter((user: any) => 
        !currentMemberIds.includes(user.id)
      ) || []

      setUsers(availableUsers)
      setFilteredUsers(availableUsers)

      logger.info('Available users loaded', { 
        projectId, 
        total: allUsers?.length,
        available: availableUsers.length 
      })
    } catch (error) {
      logger.error('Error loading users', { projectId }, error as Error)
      setError('Error al cargar usuarios disponibles')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId || !selectedRole) {
      setError('Selecciona un usuario y un rol')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: selectedUserId,
          role_in_project: selectedRole,
          assigned_by: profile?.id,
          is_active: true
        })

      if (error) {
        console.error('❌ Error al insertar miembro:', error)
        throw error
      }

      logger.info('Member added to project', { 
        projectId, 
        userId: selectedUserId, 
        role: selectedRole 
      })

      setSuccess(true)
      setTimeout(() => {
        onMemberAdded()
      }, 1000)
    } catch (error: any) {
      console.error('❌ Error completo:', error)
      logger.error('Error adding member', { 
        projectId, 
        userId: selectedUserId 
      }, error as Error)
      setError(`Error al agregar miembro: ${error.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Agregar Miembro al Equipo
          </DialogTitle>
          <DialogDescription>
            Selecciona un usuario y asigna su rol en el proyecto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              <AlertDescription>Miembro agregado exitosamente</AlertDescription>
            </Alert>
          )}

          {/* Búsqueda de usuario */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Buscar Usuario</Label>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link href="/admin/users/new" target="_blank">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Nuevo Usuario
                </Link>
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de usuarios */}
          <div className="space-y-2">
            <Label>Seleccionar Usuario</Label>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Cargando usuarios...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUserId === user.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{user.full_name}</p>
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        {selectedUserId === user.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selección de rol */}
          {selectedUserId && (
            <div className="space-y-2">
              <Label>Rol en el Proyecto</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-gray-500">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview del usuario seleccionado */}
          {selectedUser && selectedRole && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Resumen de Asignación:
              </p>
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback>
                    {getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedUser.full_name}</p>
                  <p className="text-xs text-gray-600">
                    {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddMember} 
            disabled={!selectedUserId || !selectedRole || saving || success}
          >
            {saving ? 'Agregando...' : 'Agregar al Equipo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
