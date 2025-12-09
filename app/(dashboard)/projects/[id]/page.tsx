'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Edit, 
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  FileText, 
  MessageSquare,
  Settings,
  Plus,
  FileEdit
} from 'lucide-react'
import Link from 'next/link'
import { Project, Company, User, ProjectStatus, InterventionType } from '@/types'
import { BitacoraTab } from '@/components/projects/BitacoraTab'
// import { ReportsTab } from '@/components/projects/ReportsTab'
import { ProjectOverview } from '@/components/projects/ProjectOverview'
// import { ChatTab } from '@/components/chat/ChatTab'

interface ProjectWithCompany extends Project {
  company: Company
  team_members?: Array<{
    user: User
    role: string
    assigned_at: string
  }>
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [project, setProject] = useState<ProjectWithCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  const projectId = params.id as string

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  const loadProject = async () => {
    try {
      console.log('🔄 Cargando proyecto:', projectId)
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          company:companies!client_company_id(*)
        `)
        .eq('id', projectId)
        .single()

      console.log('✅ Proyecto cargado:', data ? 'OK' : 'NULL', error ? error.message : '')

      if (error) throw error

      setProject(data as any)
    } catch (error: any) {
      console.error('❌ Error loading project:', error)
      setError(error.message || 'Error al cargar el proyecto')
    } finally {
      setLoading(false)
      console.log('🏁 Carga de proyecto finalizada')
    }
  }

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'activo':
        return 'bg-green-100 text-green-800'
      case 'pausado':
        return 'bg-yellow-100 text-yellow-800'
      case 'finalizado':
        return 'bg-gray-100 text-gray-800'
      case 'planificacion':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: ProjectStatus) => {
    switch (status) {
      case 'activo':
        return 'Activo'
      case 'pausado':
        return 'Pausado'
      case 'finalizado':
        return 'Finalizado'
      case 'planificacion':
        return 'Planificación'
      default:
        return status
    }
  }

  const getInterventionTypeLabel = () => {
    if (!project?.intervention_types) return 'No especificado'
    
    return project.intervention_types.map(type => {
      switch (type) {
        case 'sti_continua':
          return 'STI Continua'
        case 'sti_itinerante':
          return 'STI Itinerante'
        case 'interventoria_desembolsos':
          return 'Interventoría de Desembolsos'
        case 'interventoria':
          return 'Interventoría'
        case 'interventoria_itinerante':
          return 'Interventoría Itinerante'
        case 'otro':
          return project.intervention_types_other || 'Otro'
        case 'supervision_tecnica':
          return 'Supervisión Técnica'
        case 'interventoria_administrativa':
          return 'Interventoría Administrativa'
        default:
          return type
      }
    }).join(', ')
  }

  const hasInterventoriaDesembolsos = project?.intervention_types.includes('interventoria_desembolsos')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Link>
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'Proyecto no encontrado'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500">{project.company.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(project.status)}>
            {getStatusText(project.status)}
          </Badge>
          {hasPermission('projects', 'update') && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${project.id}/report-template`}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Plantilla de Informes
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/projects/${project.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Información General</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-600">{project.address}</span>
              </div>
              {project.city && (
                <div className="text-sm text-gray-600">
                  {project.city}
                </div>
              )}
              <div className="text-sm text-gray-600">
                {getInterventionTypeLabel()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipo de Trabajo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.team_members?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              miembros asignados
            </p>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cronograma</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {project.start_date && (
                <div className="text-sm">
                  <span className="text-gray-500">Inicio: </span>
                  {new Date(project.start_date).toLocaleDateString('es-CO')}
                </div>
              )}
              {project.end_date && (
                <div className="text-sm">
                  <span className="text-gray-500">Fin: </span>
                  {new Date(project.end_date).toLocaleDateString('es-CO')}
                </div>
              )}
              {!project.start_date && !project.end_date && (
                <p className="text-xs text-muted-foreground">Sin fechas definidas</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget - solo si tiene interventoría de desembolsos */}
        {hasInterventoriaDesembolsos && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {project.budget ? (
                <div className="text-2xl font-bold">
                  ${new Intl.NumberFormat('es-CO').format(project.budget)}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin presupuesto definido</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs Content */}
      <div className="mt-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
            <TabsTrigger value="bitacora">Bitácora</TabsTrigger>
            <TabsTrigger value="reports">Informes</TabsTrigger>
            {hasInterventoriaDesembolsos && (
              <TabsTrigger value="financial">Financiero</TabsTrigger>
            )}
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ProjectOverview project={project as any} />
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto text-talento-green mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Gestión del Equipo</h3>
                  <p className="text-gray-600 mb-6">
                    Administra los miembros del equipo de trabajo,
                    <br />
                    asigna roles y gestiona permisos del proyecto.
                  </p>
                  <Link href={`/projects/${project.id}/team`}>
                    <Button>
                      <Users className="h-4 w-4 mr-2" />
                      Gestionar Equipo
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bitacora" className="space-y-4">
            <BitacoraTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Configurar Plantilla */}
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileEdit className="h-16 w-16 mx-auto text-talento-green mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Plantilla de Informes</h3>
                    <p className="text-gray-600 mb-6">
                      Configura la plantilla base para los informes quincenales.
                      <br />
                      Define secciones y contenido con placeholders.
                    </p>
                    <Link href={`/projects/${project.id}/report-template`}>
                      <Button>
                        <FileEdit className="h-4 w-4 mr-2" />
                        Configurar Plantilla
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Crear Informe */}
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Crear Informe Quincenal</h3>
                    <p className="text-gray-600 mb-6">
                      Genera un nuevo informe quincenal automáticamente
                      <br />
                      desde la plantilla configurada.
                    </p>
                    <Link href="/reports/biweekly/new">
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Informe
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {hasInterventoriaDesembolsos && (
            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <DollarSign className="h-16 w-16 mx-auto text-talento-green mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Estado de Cuentas</h3>
                    <p className="text-gray-600 mb-6">
                      Consulta el estado de cuentas del proyecto,
                      <br />
                      órdenes de pago autorizadas y legalizadas.
                    </p>
                    <Link href={`/projects/${project.id}/financial/simple`}>
                      <Button>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Ver Estado de Cuentas
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="chat" className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              Módulo de chat en desarrollo
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
