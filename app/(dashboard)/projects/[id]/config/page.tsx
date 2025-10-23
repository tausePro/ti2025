'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  Settings, 
  DollarSign, 
  FileText, 
  Calendar,
  Building2,
  AlertCircle
} from 'lucide-react'
import { FiduciaryInfoForm } from '@/components/projects/FiduciaryInfoForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

interface Project {
  id: string
  name: string
  project_code: string
  intervention_types: string[]
  status: string
}

export default function ProjectConfigPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code, intervention_types, status')
        .eq('id', projectId)
        .single()

      if (error) throw error
      
      setProject(data)
      logger.info('Project loaded for configuration', { projectId })
    } catch (error) {
      logger.error('Error loading project', { projectId }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  const isAdministrativeIntervention = project?.intervention_types?.includes('interventoria_administrativa') || 
                                       project?.intervention_types?.includes('interventoria')

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId)

      if (error) throw error

      setProject(prev => prev ? { ...prev, status: newStatus } : null)
      alert('✅ Estado del proyecto actualizado exitosamente')
      logger.info('Project status updated', { projectId, newStatus })
    } catch (error) {
      logger.error('Error updating project status', { projectId }, error as Error)
      alert('❌ Error al actualizar el estado del proyecto')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Proyecto no encontrado</AlertDescription>
        </Alert>
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
              <Settings className="h-6 w-6 mr-3" />
              Configuración del Proyecto
            </h1>
            <p className="text-gray-500 mt-1">
              {project.project_code} - {project.name}
            </p>
          </div>
        </div>
        <Badge variant={project.status === 'activo' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
      </div>

      {/* Tabs de Configuración */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="bitacora">
            <FileText className="h-4 w-4 mr-2" />
            Bitácoras
          </TabsTrigger>
          <TabsTrigger value="fiduciary" disabled={!isAdministrativeIntervention}>
            <DollarSign className="h-4 w-4 mr-2" />
            Fiduciaria
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" />
            Cronograma
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuración General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Información básica y configuración del proyecto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Código del Proyecto</label>
                  <p className="text-sm text-gray-900 mt-1">{project.project_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipos de Intervención</label>
                  <p className="text-sm text-gray-900 mt-1">{project.intervention_types?.join(', ') || 'N/A'}</p>
                </div>
              </div>

              {/* Cambiar estado del proyecto */}
              <div className="space-y-2">
                <Label htmlFor="status">Estado del Proyecto</Label>
                <Select value={project.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planificacion">Planificación</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Cambia el estado del proyecto según su avance
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Para modificar la información general del proyecto, usa el botón "Editar Proyecto"
                </AlertDescription>
              </Alert>

              <Button onClick={() => router.push(`/projects/${projectId}/edit`)}>
                Editar Información General
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configuración de Bitácoras */}
        <TabsContent value="bitacora" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Bitácoras</CardTitle>
              <CardDescription>
                Personaliza los campos de las bitácoras diarias del proyecto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-talento-green" />
                <h3 className="text-lg font-medium mb-2">Plantillas de Bitácoras</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Configura campos personalizados para las bitácoras diarias
                  <br />
                  Agrega campos específicos según las necesidades del proyecto
                </p>
                <Button onClick={() => router.push(`/projects/${projectId}/config/bitacora`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Configurar Bitácoras
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configuración Fiduciaria */}
        <TabsContent value="fiduciary" className="space-y-4">
          {isAdministrativeIntervention ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Configuración Fiduciaria</CardTitle>
                  <CardDescription>
                    Gestión de cuentas SIFI y configuración financiera
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">SIFI 1</h4>
                      <p className="text-xs text-blue-700">Cuenta principal del proyecto</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-1">SIFI 2</h4>
                      <p className="text-xs text-green-700">Cuenta secundaria (opcional)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <FiduciaryInfoForm 
                onSubmit={async (data) => {
                  logger.info('Fiduciary config saved', { projectId, data })
                }}
                onCancel={() => setActiveTab('general')}
              />
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                La configuración fiduciaria solo está disponible para proyectos con interventoría administrativa.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos del Proyecto</CardTitle>
              <CardDescription>
                Gestión de contratos, actas, planos y otros documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-medium mb-2">Gestiona los documentos del proyecto</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Sube y organiza contratos, reportes, fotos, planos y más
                </p>
                <Button onClick={() => router.push(`/projects/${projectId}/documents`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Ir a Documentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cronograma */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cronograma del Proyecto</CardTitle>
              <CardDescription>
                Hitos, actividades y fechas clave
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="mb-4">Módulo de cronograma en desarrollo</p>
                <p className="text-sm">
                  Próximamente podrás gestionar el cronograma y actividades del proyecto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
