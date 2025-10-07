'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, DollarSign, Building2, AlertCircle, CheckCircle } from 'lucide-react'
import { FiduciaryInfoForm } from '@/components/projects/FiduciaryInfoForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

interface Project {
  id: string
  name: string
  project_code: string
  intervention_type: string
}

export default function ProjectFiduciaryPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission } = useAuth()
  const supabase = createClient()
  
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code, intervention_type')
        .eq('id', projectId)
        .single()

      if (error) throw error
      
      setProject(data)
      logger.info('Project loaded for fiduciary config', { projectId })
    } catch (error) {
      logger.error('Error loading project', { projectId }, error as Error)
      setError('Error al cargar el proyecto')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (fiduciaryData: any) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      logger.info('Saving fiduciary configuration', { projectId, data: fiduciaryData })
      
      // La lógica de guardado está en el componente FiduciaryInfoForm
      // Aquí solo manejamos el feedback
      setSuccess(true)
      
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error) {
      logger.error('Error saving fiduciary config', { projectId }, error as Error)
      setError('Error al guardar la configuración fiduciaria')
    } finally {
      setSaving(false)
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
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    )
  }

  // Solo mostrar configuración fiduciaria si es interventoría administrativa
  const isAdministrativeIntervention = project.intervention_type === 'administrativa' || 
                                       project.intervention_type?.includes('administrativa')

  if (!isAdministrativeIntervention) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración Fiduciaria</h1>
            <p className="text-gray-500 mt-1">
              {project.project_code} - {project.name}
            </p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            La configuración fiduciaria solo está disponible para proyectos con interventoría administrativa.
            Este proyecto tiene tipo de intervención: <strong>{project.intervention_type}</strong>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>¿Necesitas configuración fiduciaria?</CardTitle>
            <CardDescription>
              Para habilitar la configuración fiduciaria, actualiza el tipo de intervención del proyecto a "Administrativa"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/projects/${projectId}/edit`)}>
              Editar Proyecto
            </Button>
          </CardContent>
        </Card>
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
              <DollarSign className="h-6 w-6 mr-3" />
              Configuración Fiduciaria
            </h1>
            <p className="text-gray-500 mt-1">
              {project.project_code} - {project.name}
            </p>
          </div>
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
          <AlertDescription>Configuración guardada exitosamente</AlertDescription>
        </Alert>
      )}

      {/* Información */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sobre la Configuración Fiduciaria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            La configuración fiduciaria permite gestionar las cuentas SIFI (Sistema Integral de Información Fiduciaria) 
            del proyecto y configurar el flujo financiero.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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

      {/* Formulario Fiduciario */}
      <Card>
        <CardHeader>
          <CardTitle>Formulario Fiduciario</CardTitle>
          <CardDescription>
            Configura las cuentas SIFI y el flujo financiero del proyecto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FiduciaryInfoForm 
            onSubmit={async (data) => {
              await handleSave(data)
            }}
            onCancel={() => router.back()}
            loading={saving}
          />
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuración Financiera</CardTitle>
          <CardDescription>
            Define cómo se manejan los pagos en este proyecto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium mb-1">Actas vs Legalizaciones</h4>
            <p className="text-gray-600">
              <strong>Actas:</strong> Los pagos se realizan contra actas de obra firmadas.<br />
              <strong>Legalizaciones:</strong> Los pagos requieren legalización de gastos.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Aprobación Fiduciaria</h4>
            <p className="text-gray-600">
              Si está habilitada, todas las órdenes de pago requieren aprobación del fiduciario antes de procesarse.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
