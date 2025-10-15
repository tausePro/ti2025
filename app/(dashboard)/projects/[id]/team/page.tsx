'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  UserPlus, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar,
  Trash2,
  Edit,
  Shield
} from 'lucide-react'
import { AddTeamMemberDialog } from '@/components/projects/AddTeamMemberDialog'
import { logger } from '@/lib/logger'

interface ProjectMember {
  id: string
  user_id: string
  project_id: string
  role_in_project: 'supervisor' | 'residente' | 'ayudante' | 'especialista'
  assigned_at: string
  assigned_by: string
  is_active: boolean
  user: {
    id: string
    full_name: string
    email: string
    phone?: string
    avatar_url?: string
    role: string
  }
}

interface Project {
  id: string
  name: string
  project_code: string
  status: string
}

export default function ProjectTeamPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission, profile } = useAuth()
  const supabase = createClient()
  
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    loadProjectData()
    loadTeamMembers()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code, status')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      logger.error('Error loading project', { projectId }, error as Error)
    }
  }

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:profiles(
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })

      if (error) throw error

      setMembers(data || [])
      logger.info('Team members loaded', { projectId, count: data?.length })
    } catch (error) {
      logger.error('Error loading team members', { projectId }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('¿Estás seguro de remover este miembro del proyecto?')) return

    try {
      const { error } = await supabase
        .from('project_members')
        .update({ is_active: false })
        .eq('id', memberId)

      if (error) throw error

      logger.info('Member removed from project', { memberId, projectId })
      loadTeamMembers()
    } catch (error) {
      logger.error('Error removing member', { memberId }, error as Error)
    }
  }

  const handleMemberAdded = () => {
    setShowAddDialog(false)
    loadTeamMembers()
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      supervisor: 'bg-blue-100 text-blue-800',
      residente: 'bg-green-100 text-green-800',
      ayudante: 'bg-yellow-100 text-yellow-800',
      especialista: 'bg-purple-100 text-purple-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      supervisor: 'Supervisor',
      residente: 'Residente',
      ayudante: 'Ayudante',
      especialista: 'Especialista'
    }
    return labels[role] || role
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="h-6 w-6 mr-3" />
              Equipo de Trabajo
            </h1>
            {project && (
              <p className="text-gray-500 mt-1">
                {project.project_code} - {project.name}
              </p>
            )}
          </div>
        </div>
        
        {(hasPermission('projects', 'assign') || ['super_admin', 'admin', 'supervisor'].includes(profile?.role || '')) && (
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar Miembro
          </Button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Miembros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Supervisores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.role_in_project === 'supervisor').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Residentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.role_in_project === 'residente').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Especialistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.role_in_project === 'especialista').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Miembros */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo</CardTitle>
          <CardDescription>
            Usuarios asignados a este proyecto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay miembros asignados
              </h3>
              <p className="text-gray-500 mb-6">
                Agrega usuarios al equipo de trabajo de este proyecto
              </p>
              {hasPermission('projects', 'assign') && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar Primer Miembro
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.user.avatar_url} />
                      <AvatarFallback>
                        {getInitials(member.user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {member.user.full_name}
                        </h3>
                        <Badge className={getRoleBadgeColor(member.role_in_project)}>
                          {getRoleLabel(member.role_in_project)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {member.user.role}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {member.user.email}
                        </div>
                        {member.user.phone && (
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {member.user.phone}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Desde {new Date(member.assigned_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {hasPermission('projects', 'assign') && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar miembro */}
      {showAddDialog && (
        <AddTeamMemberDialog
          projectId={projectId}
          onClose={() => setShowAddDialog(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}
    </div>
  )
}
