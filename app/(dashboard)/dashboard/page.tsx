'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  FileText, 
  Users, 
  Plus, 
  Settings, 
  Palette,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  TrendingUp,
  Calendar,
  ArrowRight,
  FileBarChart,
  ClipboardCheck,
  Wallet
} from 'lucide-react'
import Link from 'next/link'
import { formatDateValue } from '@/lib/utils'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  pendingReports: number
  pendingSignature: number
  totalTeamMembers: number
  recentBitacoras: number
  pendingQC: number
}

interface RecentReport {
  id: string
  report_number: string | null
  short_title: string | null
  status: string
  period_start: string
  period_end: string
  project: { name: string; project_code: string } | null
}

interface RecentProject {
  id: string
  name: string
  project_code: string
  status: string
  progress_percentage: number
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  residente: 'Residente',
  cliente: 'Cliente'
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: FileText },
  pending_review: { label: 'Revisión', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  pending_signature: { label: 'Firma', color: 'bg-purple-100 text-purple-800', icon: Send },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    pendingReports: 0,
    pendingSignature: 0,
    totalTeamMembers: 0,
    recentBitacoras: 0,
    pendingQC: 0
  })
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [userProjectIds, setUserProjectIds] = useState<string[]>([])
  const supabase = createClient()
  const { hasPermission } = usePermissions()
  const { profile } = useAuth()

  const role = profile?.role || ''
  const isAdmin = ['super_admin', 'admin'].includes(role)
  const isGerente = role === 'gerente'
  const isSupervisor = role === 'supervisor'
  const isResidente = role === 'residente'

  useEffect(() => {
    if (profile) loadDashboardData()
    else setLoading(false)
  }, [profile])

  async function loadDashboardData() {
    try {
      const noId = ['00000000-0000-0000-0000-000000000000']
      let projectIds: string[] = []

      if (isAdmin || isGerente) {
        const { data } = await supabase.from('projects').select('id')
        projectIds = data?.map(p => p.id) || []
      } else {
        const { data } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', profile!.id)
          .eq('is_active', true)
        projectIds = data?.map(m => m.project_id) || []
      }
      setUserProjectIds(projectIds)
      const pIds = projectIds.length > 0 ? projectIds : noId

      // Estadísticas base en paralelo
      const [
        { count: totalCount },
        { count: activeCount },
        { count: pendingReviewCount },
        { count: pendingSignCount },
        { data: membersData },
        { count: recentBitacorasCount },
        { count: pendingQCCount }
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).in('id', pIds),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'activo').in('id', pIds),
        supabase.from('biweekly_reports').select('*', { count: 'exact', head: true }).in('status', ['pending_review', 'rejected']).in('project_id', pIds),
        supabase.from('biweekly_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending_signature').in('project_id', pIds),
        supabase.from('project_members').select('user_id').eq('is_active', true).in('project_id', pIds),
        supabase.from('daily_logs').select('*', { count: 'exact', head: true }).in('project_id', pIds).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('quality_control_samples').select('*', { count: 'exact', head: true }).in('project_id', pIds).eq('status', 'pending')
      ])

      setStats({
        totalProjects: totalCount || 0,
        activeProjects: activeCount || 0,
        pendingReports: pendingReviewCount || 0,
        pendingSignature: pendingSignCount || 0,
        totalTeamMembers: new Set((membersData || []).map(m => m.user_id)).size,
        recentBitacoras: recentBitacorasCount || 0,
        pendingQC: pendingQCCount || 0
      })

      // Informes recientes
      const { data: reportsData } = await supabase
        .from('biweekly_reports')
        .select('id, report_number, short_title, status, period_start, period_end, project:projects(name, project_code)')
        .in('project_id', pIds)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentReports((reportsData || []).map((r: any) => ({
        ...r,
        project: Array.isArray(r.project) ? r.project[0] : r.project
      })))

      // Proyectos recientes
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, project_code, status, progress_percentage')
        .in('id', pIds)
        .eq('status', 'activo')
        .order('updated_at', { ascending: false })
        .limit(5)

      setRecentProjects(projectsData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con saludo personalizado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}
        </h1>
        <p className="text-gray-500 mt-1">
          {ROLE_LABELS[role] || role} &middot; {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards - adaptadas por rol */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">de {stats.totalProjects} total</p>
          </CardContent>
        </Card>

        {(isSupervisor || isAdmin) && (
          <Card className={stats.pendingReports > 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Informes por Revisar</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReports}</div>
              <p className="text-xs text-muted-foreground">pendientes de revisión</p>
            </CardContent>
          </Card>
        )}

        {isGerente && (
          <Card className={stats.pendingSignature > 0 ? 'border-purple-200 bg-purple-50/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes de Firma</CardTitle>
              <Send className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSignature}</div>
              <p className="text-xs text-muted-foreground">informes listos para firmar</p>
            </CardContent>
          </Card>
        )}

        {isResidente && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bitácoras (7 días)</CardTitle>
              <ClipboardList className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentBitacoras}</div>
              <p className="text-xs text-muted-foreground">registradas esta semana</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeamMembers}</div>
            <p className="text-xs text-muted-foreground">miembros activos</p>
          </CardContent>
        </Card>

        {stats.pendingQC > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QC Pendientes</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingQC}</div>
              <p className="text-xs text-muted-foreground">muestras sin resultado</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sección de contenido principal - 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Informes recientes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informes recientes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Informes Recientes</CardTitle>
                <CardDescription>Últimos informes quincenales</CardDescription>
              </div>
              <Link href="/reports/biweekly">
                <Button variant="ghost" size="sm">
                  Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentReports.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No hay informes registrados</p>
              ) : (
                <div className="space-y-3">
                  {recentReports.map(report => {
                    const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft
                    const Icon = cfg.icon
                    return (
                      <Link
                        key={report.id}
                        href={`/reports/biweekly/${report.id}/preview`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${cfg.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {report.short_title || report.report_number || 'Sin título'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {report.project?.project_code} &middot; {formatDateValue(report.period_start)} - {formatDateValue(report.period_end)}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} flex-shrink-0`}>
                          {cfg.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proyectos activos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Proyectos Activos</CardTitle>
                <CardDescription>Progreso de tus proyectos</CardDescription>
              </div>
              <Link href="/projects">
                <Button variant="ghost" size="sm">
                  Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No hay proyectos activos</p>
              ) : (
                <div className="space-y-4">
                  {recentProjects.map(project => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                          <p className="text-xs text-gray-500">{project.project_code}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 ml-2">
                          {project.progress_percentage || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${project.progress_percentage || 0}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: Acciones rápidas */}
        <div className="space-y-6">
          {/* Acciones Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Residente: registrar bitácora */}
              {isResidente && userProjectIds.length > 0 && (
                <Link href={`/projects/${userProjectIds[0]}/daily-logs`}>
                  <Button className="w-full justify-start bg-green-600 hover:bg-green-700 mb-2">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Registrar Bitácora
                  </Button>
                </Link>
              )}

              {/* Residente y Supervisor: nuevo informe */}
              {(isResidente || isSupervisor) && (
                <Link href="/reports/biweekly/new">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Nuevo Informe Quincenal
                  </Button>
                </Link>
              )}

              {/* Supervisor: revisar informes */}
              {isSupervisor && stats.pendingReports > 0 && (
                <Link href="/supervisor/reports">
                  <Button variant="outline" className="w-full justify-start mb-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                    <Clock className="h-4 w-4 mr-2" />
                    Revisar Informes ({stats.pendingReports})
                  </Button>
                </Link>
              )}

              {/* Supervisor: ver bitácoras */}
              {isSupervisor && (
                <Link href="/supervisor/daily-logs">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Ver Bitácoras
                  </Button>
                </Link>
              )}

              {/* Gerente: firmar informes */}
              {isGerente && stats.pendingSignature > 0 && (
                <Link href="/reports/biweekly">
                  <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700 mb-2">
                    <Send className="h-4 w-4 mr-2" />
                    Firmar Informes ({stats.pendingSignature})
                  </Button>
                </Link>
              )}

              {/* Gerente: desembolsos */}
              {isGerente && (
                <Link href="/desembolsos">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <Wallet className="h-4 w-4 mr-2" />
                    Desembolsos
                  </Button>
                </Link>
              )}

              {/* Admin: crear proyecto */}
              {hasPermission('projects', 'create') && (
                <Link href="/projects/new">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Proyecto
                  </Button>
                </Link>
              )}

              {/* Admin: empresas */}
              {hasPermission('companies', 'create') && (
                <Link href="/admin/companies/new">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <Building2 className="h-4 w-4 mr-2" />
                    Nueva Empresa
                  </Button>
                </Link>
              )}

              {/* Todos: ver proyectos */}
              <Link href="/projects">
                <Button variant="outline" className="w-full justify-start mb-2">
                  <Building2 className="h-4 w-4 mr-2" />
                  Ver Proyectos
                </Button>
              </Link>

              {/* Todos (excepto cliente): control de calidad */}
              {role !== 'cliente' && (
                <Link href="/quality-control">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Control de Calidad
                  </Button>
                </Link>
              )}

              {/* Super admin: configuración */}
              {role === 'super_admin' && (
                <Link href="/admin/ai-settings">
                  <Button variant="outline" className="w-full justify-start mb-2 border-purple-300 text-purple-700 hover:bg-purple-50">
                    <Palette className="h-4 w-4 mr-2" />
                    Configuración IA
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Alertas por rol */}
          {(stats.pendingReports > 0 && isSupervisor) && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Informes por Revisar</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Tienes {stats.pendingReports} informe(s) quincenal(es) pendientes de tu revisión y aprobación.
                    </p>
                    <Link href="/supervisor/reports">
                      <Button variant="link" size="sm" className="text-yellow-700 px-0 mt-1">
                        Ir a revisar <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(stats.pendingSignature > 0 && isGerente) && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Send className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">Informes Listos para Firma</p>
                    <p className="text-xs text-purple-700 mt-1">
                      Hay {stats.pendingSignature} informe(s) aprobados por supervisión esperando tu firma para publicación.
                    </p>
                    <Link href="/reports/biweekly">
                      <Button variant="link" size="sm" className="text-purple-700 px-0 mt-1">
                        Ir a firmar <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
