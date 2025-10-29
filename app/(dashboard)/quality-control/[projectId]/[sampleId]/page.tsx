'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  MapPin, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus
} from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  project_code: string
}

interface QualitySample {
  id: string
  sample_number: string
  sample_code: string
  sample_date: string
  location: string
  status: string
  overall_result: string | null
  notes: string
  custom_data: Record<string, any>
  template: {
    template_name: string
    template_type: string
    custom_fields: Array<{
      name: string
      type: string
      label: string
      unit?: string
    }>
  }
}

interface QualityTest {
  id: string
  test_name: string
  test_period: number
  test_date: string
  actual_test_date: string | null
  status: string
  results: Array<{
    id: string
    specimen_number: number
    result_value: number
    meets_criteria: boolean | null
    deviation_percentage: number | null
    notes: string
  }>
}

export default function SampleDetailsPage({ 
  params 
}: { 
  params: { projectId: string; sampleId: string } 
}) {
  const { profile, hasPermission } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [project, setProject] = useState<Project | null>(null)
  const [sample, setSample] = useState<QualitySample | null>(null)
  const [tests, setTests] = useState<QualityTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSample()
  }, [])

  const loadSample = async () => {
    try {
      // Cargar proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('id', params.projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Cargar muestra con template
      const { data: sampleData, error: sampleError } = await supabase
        .from('quality_control_samples')
        .select(`
          *,
          template:quality_control_templates(
            template_name,
            template_type,
            custom_fields
          )
        `)
        .eq('id', params.sampleId)
        .single()

      if (sampleError) throw sampleError
      setSample(sampleData)

      // Cargar ensayos con resultados
      const { data: testsData, error: testsError } = await supabase
        .from('quality_control_tests')
        .select(`
          *,
          results:quality_control_results(
            id,
            specimen_number,
            result_value,
            meets_criteria,
            deviation_percentage,
            notes
          )
        `)
        .eq('sample_id', params.sampleId)
        .order('test_period')

      if (testsError) throw testsError
      setTests(testsData || [])
    } catch (error: any) {
      console.error('Error loading sample:', error)
      setError(error.message || 'Error al cargar la muestra')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      approved: 'bg-purple-100 text-purple-800'
    }
    
    const labels = {
      pending: 'Pendiente',
      in_progress: 'En Proceso',
      completed: 'Completado',
      failed: 'Fallido',
      approved: 'Aprobado'
    }

    const icons = {
      pending: Clock,
      in_progress: Clock,
      completed: CheckCircle,
      failed: AlertTriangle,
      approved: CheckCircle
    }

    const Icon = icons[status as keyof typeof icons] || Clock

    return (
      <Badge className={`${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        <Icon className="w-3 h-3 mr-1" />
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getResultBadge = (result: string | null) => {
    if (!result) return null
    
    const styles = {
      'CUMPLE': 'bg-green-100 text-green-800 border-green-200',
      'NO CUMPLE': 'bg-red-100 text-red-800 border-red-200',
      'ENVIAR TESTIGOS': 'bg-orange-100 text-orange-800 border-orange-200'
    }

    const icons = {
      'CUMPLE': CheckCircle,
      'NO CUMPLE': AlertTriangle,
      'ENVIAR TESTIGOS': AlertTriangle
    }

    const Icon = icons[result as keyof typeof icons] || AlertTriangle

    return (
      <Badge variant="outline" className={`${styles[result as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        <Icon className="w-3 h-3 mr-1" />
        {result}
      </Badge>
    )
  }

  const formatCustomFieldValue = (field: any, value: any) => {
    if (value === null || value === undefined || value === '') return '-'
    
    switch (field.type) {
      case 'number':
        return field.unit ? `${value} ${field.unit}` : value.toString()
      case 'select':
        return value
      case 'date':
        return new Date(value).toLocaleDateString('es-CO')
      default:
        return value.toString()
    }
  }

  const canEdit = hasPermission('control_calidad', 'update')
  const canAddResults = hasPermission('control_calidad', 'update')

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-center text-gray-600">Cargando detalles...</p>
      </div>
    )
  }

  if (error || !sample || !project) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Alert>
          <AlertDescription>
            {error || 'Muestra no encontrada'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/quality-control"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Control de Calidad
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Muestra #{sample.sample_number}
            </h1>
            <p className="text-gray-600">
              Proyecto: {project.project_code} - {project.name}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {getStatusBadge(sample.status)}
            {getResultBadge(sample.overall_result)}
            {canEdit && (
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la Muestra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Código</p>
                    <p className="font-medium">{sample.sample_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="font-medium">
                      {new Date(sample.sample_date).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Ubicación</p>
                    <p className="font-medium">{sample.location || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{sample.template.template_name}</p>
                </div>
              </div>
              {sample.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Observaciones</p>
                  <p className="text-gray-700">{sample.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campos personalizados */}
          {sample.template.custom_fields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Control</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sample.template.custom_fields.map(field => (
                    <div key={field.name}>
                      <p className="text-sm text-gray-500 mb-1">{field.label}</p>
                      <p className="font-medium">
                        {formatCustomFieldValue(field, sample.custom_data[field.name])}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ensayos programados */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ensayos Programados</CardTitle>
                  <CardDescription>
                    Resultados y estado de cada ensayo
                  </CardDescription>
                </div>
                {canAddResults && (
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Resultados
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay ensayos programados
                </p>
              ) : (
                <div className="space-y-4">
                  {tests.map(test => (
                    <div key={test.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">
                            {test.test_name} - {test.test_period} días
                          </h4>
                          <p className="text-sm text-gray-500">
                            Programado: {new Date(test.test_date).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        {getStatusBadge(test.status)}
                      </div>

                      {/* Resultados */}
                      {test.results.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Resultados:</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {test.results.map(result => (
                              <div key={result.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    Cilindro {result.specimen_number}
                                  </span>
                                  <span className="text-sm">
                                    {result.result_value}
                                  </span>
                                </div>
                                {result.meets_criteria !== null && (
                                  <Badge variant={result.meets_criteria ? 'default' : 'destructive'} className="text-xs">
                                    {result.meets_criteria ? 'OK' : 'NO'}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Sin resultados registrados
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Acciones rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canEdit && (
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Muestra
                </Button>
              )}
              {canAddResults && (
                <Button className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Resultados
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                  Generar Informe
              </Button>
            </CardContent>
          </Card>

          {/* Resumen de estado */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Ensayos</span>
                <span className="font-medium">{tests.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Completados</span>
                <span className="font-medium">
                  {tests.filter(t => t.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Pendientes</span>
                <span className="font-medium">
                  {tests.filter(t => t.status === 'pending').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
