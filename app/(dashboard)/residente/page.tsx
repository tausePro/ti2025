'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Plus,
  Eye
} from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  project_code: string
  status: string
  progress_percentage: number
}

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  pendingBitacoras: number
  completedBitacoras: number
  pendingReports: number
}

export default function ResidenteDashboardPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    pendingBitacoras: 0,
    completedBitacoras: 0,
    pendingReports: 0
  })

  useEffect(() => {
    if (profile && profile.role !== 'residente') {
      router.push('/dashboard')
      return
    }

    if (profile) {
      loadDashboardData()
    }
  }, [profile, router])

  async function loadDashboardData() {
    try {
      console.log('🔄 Cargando dashboard de residente...')

      // Cargar proyectos asignados al residente
      const { data: memberProjects, error: membersError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile!.id)
        .eq('role_in_project', 'residente')
        .eq('is_active', true)

      if (membersError) throw membersError

      const projectIds = (memberProjects || []).map(m => m.project_id)

      if (projectIds.length === 0) {
        setProjects([])
        setLoading(false)
        return
      }

      // Cargar detalles de los proyectos
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, project_code, status, progress_percentage')
        .in('id', projectIds)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      setProjects(projectsData || [])

      // Calcular estadísticas
      const activeProjects = (projectsData || []).filter(p => p.status === 'activo').length

      // Contar bitácoras del mes actual
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: bitacorasCount } = await supabase
        .from('daily_logs')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('created_by', profile!.id)
        .gte('date', startOfMonth.toISOString())

      // Contar reportes pendientes de corrección
      const { count: reportsCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('created_by', profile!.id)
        .eq('status', 'corrections')

      // Días laborables del mes (aproximado: 22 días)
      const today = new Date()
      const currentDay = today.getDate()
      const workDaysElapsed = Math.min(currentDay, 22)

      setStats({
        totalProjects: projectsData?.length || 0,
        activeProjects,
        pendingBitacoras: Math.max(0, workDaysElapsed - (bitacorasCount || 0)),
        completedBitacoras: bitacorasCount || 0,
        pendingReports: reportsCount || 0
      })

      console.log('✅ Dashboard cargado:', { projects: projectsData?.length, stats })
    } catch (error) {
      console.error('❌ Error loading residente dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      activo: { label: 'Activo', variant: 'default' },
      pausado: { label: 'Pausado', variant: 'secondary' },
      finalizado: { label: 'Finalizado', variant: 'secondary' }
    }

    const config = statusConfig[status] || { label: status, variant: 'secondary' }
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard del Residente</h1>
        <p className="text-gray-600 mt-1">
          Gestiona tus bitácoras diarias e informes de obra
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos Asignados</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Bitácoras del Mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedBitacoras}</div>
            <p className="text-xs text-muted-foreground">
              Registradas
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
            <CardTitle className="text-sm font-medium">Informes Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReports}</div>
            <p className="text-xs text-muted-foreground">
              Con correcciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.length > 0
                ? Math.round(projects.reduce((acc, p) => acc + p.progress_percentage, 0) / projects.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              De los proyectos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {stats.pendingBitacoras > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tienes <strong>{stats.pendingBitacoras}</strong> bitácoras pendientes de registrar este mes.
          </AlertDescription>
        </Alert>
      )}

      {stats.pendingReports > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tienes <strong>{stats.pendingReports}</strong> informes con correcciones solicitadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Proyectos Asignados */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Proyectos</CardTitle>
          <CardDescription>
            Proyectos donde estás asignado como residente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes proyectos asignados
              </h3>
              <p className="text-gray-500">
                Contacta a tu supervisor para que te asigne a un proyecto
              </p>
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
                    <p className="text-sm text-gray-600">Código: {project.project_code}</p>
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Progreso:</span>
                        <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-talento-green h-2 rounded-full"
                            style={{ width: `${project.progress_percentage}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{project.progress_percentage}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Proyecto
                      </Button>
                    </Link>
                    <Link href={`/projects/${project.id}/daily-logs/new`}>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Bitácora
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/reports/biweekly/new">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-talento-green" />
                Crear Informe
              </CardTitle>
              <CardDescription>
                Genera un nuevo informe quincenal de obra
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/reports/biweekly">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Ver Informes
              </CardTitle>
              <CardDescription>
                Revisa todos tus informes quincenales
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
