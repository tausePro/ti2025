'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Briefcase, 
  FileText, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Settings,
  ClipboardList
} from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  project_code: string
  status: string
  progress_percentage: number
  client_company?: {
    name: string
  }
}

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  pendingReports: number
  teamMembers: number
  pendingBitacoras: number
}

export default function SupervisorDashboardPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    pendingReports: 0,
    teamMembers: 0,
    pendingBitacoras: 0
  })

  useEffect(() => {
    // Verificar que sea supervisor
    if (profile && profile.role !== 'supervisor') {
      router.push('/dashboard')
      return
    }

    if (profile) {
      loadDashboardData()
    }
  }, [profile, router])

  async function loadDashboardData() {
    try {
      console.log('🔄 Cargando dashboard de supervisor...')

      // Cargar proyectos asignados al supervisor
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile!.id)
        .eq('is_active', true)

      if (membersError) throw membersError

      const projectIds = (membersData || []).map(m => m.project_id)

      if (projectIds.length === 0) {
        setProjects([])
        setLoading(false)
        return
      }

      // Cargar detalles de los proyectos
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          project_code,
          status,
          progress_percentage,
          client_company:companies!client_company_id (
            name
          )
        `)
        .in('id', projectIds)

      if (projectsError) throw projectsError

      const projects = (projectsData || []) as any
      setProjects(projects)

      // Calcular estadísticas
      const activeProjects = projects.filter((p: any) => p.status === 'activo').length

      // Contar reportes pendientes de revisión
      const { count: pendingReportsCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .in('status', ['pending_review', 'corrections'])

      // Contar miembros del equipo en todos los proyectos
      const { count: teamMembersCount } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('is_active', true)

      setStats({
        totalProjects: projects.length,
        activeProjects,
        pendingReports: pendingReportsCount || 0,
        teamMembers: teamMembersCount || 0,
        pendingBitacoras: 0 // TODO: implementar cuando tengamos bitácoras
      })

    } catch (error) {
      console.error('❌ Error loading supervisor dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      activo: { label: 'Activo', variant: 'default' },
      pausado: { label: 'Pausado', variant: 'secondary' },
      finalizado: { label: 'Finalizado', variant: 'outline' },
      planificacion: { label: 'Planificación', variant: 'secondary' }
    }

    const config = statusConfig[status] || { label: status, variant: 'outline' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Supervisor</h1>
        <p className="text-gray-600 mt-1">
          Gestiona tus proyectos, equipo e informes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos Totales</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeProjects} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Informes Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReports}</div>
            <p className="text-xs text-muted-foreground">
              Por revisar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros del Equipo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">
              En todos los proyectos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bitácoras Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBitacoras}</div>
            <p className="text-xs text-muted-foreground">
              Por registrar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.length > 0
                ? Math.round(projects.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / projects.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              De todos los proyectos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Proyectos Asignados */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Proyectos</CardTitle>
          <CardDescription>
            Proyectos donde estás asignado como supervisor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No tienes proyectos asignados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {project.client_company?.name} • {project.project_code}
                    </p>
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-talento-green h-2 rounded-full transition-all"
                            style={{ width: `${project.progress_percentage || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {project.progress_percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Proyecto
                      </Button>
                    </Link>
                    <Link href={`/projects/${project.id}/config`}>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/supervisor/reports">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-talento-green" />
                Revisar Informes
              </CardTitle>
              <CardDescription>
                {stats.pendingReports} informes esperando tu revisión
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/supervisor/daily-logs">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-talento-green" />
                Ver Bitácoras
              </CardTitle>
              <CardDescription>
                Filtra y exporta bitácoras de proyectos
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/projects">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-talento-green" />
                Gestionar Equipos
              </CardTitle>
              <CardDescription>
                Administra los miembros de tus proyectos
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/projects">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-talento-green" />
                Configurar Bitácoras
              </CardTitle>
              <CardDescription>
                Personaliza plantillas de bitácoras
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
