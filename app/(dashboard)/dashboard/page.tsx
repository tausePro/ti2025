'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, FileText, Calculator, Users, Plus, Settings, Palette } from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  pendingReports: number
  totalTeamMembers: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    pendingReports: 0,
    totalTeamMembers: 0
  })
  const [loading, setLoading] = useState(true)
  const [userProjectIds, setUserProjectIds] = useState<string[]>([])
  const supabase = createClient()
  const { hasPermission } = usePermissions()
  const { profile } = useAuth()

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        if (!profile) {
          setLoading(false)
          return
        }

        let projectIds: string[] = []

        // Obtener proyectos según el rol
        if (['super_admin', 'admin'].includes(profile.role)) {
          // Admin ve todos los proyectos
          const { data: allProjects } = await supabase
            .from('projects')
            .select('id')
          projectIds = allProjects?.map(p => p.id) || []
        } else if (profile.role === 'supervisor' || profile.role === 'residente') {
          // Supervisor y residente ven sus proyectos asignados
          const { data: memberProjects } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', profile.id)
            .eq('is_active', true)
          projectIds = memberProjects?.map(m => m.project_id) || []
        }

        setUserProjectIds(projectIds)

        // Contar proyectos totales
        const { count: totalCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])

        // Contar proyectos activos
        const { count: activeCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'activo')
          .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])

        // Contar informes quincenales pendientes (pendiente revisión o correcciones)
        const { count: reportsCount } = await supabase
          .from('biweekly_reports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending_review', 'rejected'])
          .in('project_id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])

        // Contar miembros del equipo
        const { count: membersCount } = await supabase
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .in('project_id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])

        setStats({
          totalProjects: totalCount || 0,
          activeProjects: activeCount || 0,
          pendingReports: reportsCount || 0,
          totalTeamMembers: membersCount || 0
        })
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardStats()
  }, [supabase, profile])

  // Quick actions based on role
  const getQuickActions = () => {
    const actions = []

    // Nuevo Informe Quincenal (Supervisor y Residente)
    if (profile?.role === 'supervisor' || profile?.role === 'residente') {
      actions.push({
        title: 'Nuevo Informe Quincenal',
        description: 'Crea un nuevo informe para tus proyectos',
        icon: FileText,
        href: '/reports/biweekly/new'
      })
    }

    // Ver Proyectos (Todos)
    actions.push({
      title: 'Ver Proyectos',
      description: 'Explorar todos los proyectos',
      icon: Building2,
      href: '/projects'
    })

    // Bitácoras diarias (Residente con al menos un proyecto)
    if (profile?.role === 'residente' && userProjectIds.length > 0) {
      actions.push({
        title: 'Registrar Bitácora',
        description: 'Diligencia la bitácora diaria de tu proyecto',
        icon: FileText,
        href: `/projects/${userProjectIds[0]}/daily-logs/new`
      })
    }

    return actions
  }

  const quickActions = getQuickActions()

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
      {/* Welcome Section */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Dashboard Principal
            </CardTitle>
            <CardDescription>
              Resumen de actividades y acceso rápido a funciones principales
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bienvenido a Talento Inmobiliario
            </h3>
            <p className="text-gray-600 mb-4">
              Sistema de supervisión técnica para obras de construcción
            </p>
            <p className="text-sm text-gray-500">
              Sistema configurado correctamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Proyectos
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Proyectos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Proyectos Activos
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              En desarrollo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Informes Pendientes
            </CardTitle>
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
            <CardTitle className="text-sm font-medium">
              Equipo
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeamMembers}</div>
            <p className="text-xs text-muted-foreground">
              Miembros activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {hasPermission('projects', 'create') && (
            <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Plus className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Crear Nuevo Proyecto
                </h3>
                <p className="text-gray-600 mb-4">
                  Inicia un nuevo proyecto de supervisión técnica
                </p>
                <Button asChild>
                  <Link href="/projects/new">
                    Crear Proyecto
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          
          {hasPermission('companies', 'create') && (
            <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nueva Empresa Cliente
                </h3>
                <p className="text-gray-600 mb-4">
                  Registra una nueva empresa cliente
                </p>
                <Button asChild>
                  <Link href="/admin/companies/new">
                    Crear Empresa
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Configuración de Estilos - Solo para super_admin */}
          {profile?.role === 'super_admin' && (
            <Card className="border-dashed border-2 border-purple-300 hover:border-purple-400 transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Palette className="h-12 w-12 text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Administrar Estilos
                </h3>
                <p className="text-gray-600 mb-4">
                  Personaliza colores, logos y branding de la aplicación
                </p>
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <Link href="/admin/ai-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Configuración IA
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <action.icon className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">{action.title}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={action.href}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ir
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Role-specific information */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>
            Sistema de supervisión técnica configurado correctamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            <p>El sistema está listo para su uso. Las funcionalidades disponibles dependen de los permisos asignados a tu perfil.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
