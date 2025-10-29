'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Download, Calendar, MapPin, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  project_code: string
  address: string
  city: string
}

interface QualitySample {
  id: string
  sample_number: string
  sample_code: string
  sample_date: string
  location: string
  status: string
  overall_result: string | null
  notes: string | null
  custom_data: any
  template: {
    id: string
    template_name: string
    template_type: string
    custom_fields: any[]
  }
}

interface QualityTest {
  id: string
  test_name: string
  test_period: number
  test_date: string
  status: string
  test_config: any
  results?: {
    specimen_number: number
    result_value: number
    meets_criteria: boolean | null
    deviation_percentage: number | null
    notes: string | null
  }[]
}

export default function SampleReportPage({ 
  params 
}: { 
  params: { sampleId: string } 
}) {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [project, setProject] = useState<Project | null>(null)
  const [sample, setSample] = useState<QualitySample | null>(null)
  const [tests, setTests] = useState<QualityTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar muestra
      const { data: sampleData, error: sampleError } = await supabase
        .from('quality_control_samples')
        .select(`
          *,
          template:quality_control_templates(
            id,
            template_name,
            template_type,
            custom_fields
          )
        `)
        .eq('id', params.sampleId)
        .single()

      if (sampleError) throw sampleError

      const processedSample = {
        ...sampleData,
        template: Array.isArray(sampleData.template) ? sampleData.template[0] : sampleData.template
      }

      setSample(processedSample as QualitySample)

      // Cargar proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, project_code, address, city')
        .eq('id', sampleData.project_id)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Cargar ensayos
      const { data: testsData, error: testsError } = await supabase
        .from('quality_control_tests')
        .select('*')
        .eq('sample_id', params.sampleId)
        .order('test_period', { ascending: true })

      if (testsError) throw testsError
      setTests(testsData || [])

    } catch (err: any) {
      console.error('Error loading report:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'in_progress': return 'En Progreso'
      case 'completed': return 'Completado'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getResultIcon = (result: string | null) => {
    if (!result) return <AlertCircle className="w-5 h-5 text-gray-400" />
    switch (result) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'conditional':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getResultLabel = (result: string | null) => {
    if (!result) return 'Pendiente'
    switch (result) {
      case 'approved': return 'Aprobado'
      case 'rejected': return 'Rechazado'
      case 'conditional': return 'Condicional'
      default: return result
    }
  }

  const getResultColor = (result: string | null) => {
    if (!result) return 'bg-gray-100 text-gray-800 border-gray-200'
    switch (result) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'conditional': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">Cargando informe...</p>
        </div>
      </div>
    )
  }

  if (error || !sample || !project) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error || 'No se pudo cargar el informe'}</p>
          <Link href="/quality-control/reports" className="text-red-600 hover:text-red-700 mt-2 inline-block">
            ← Volver a informes
          </Link>
        </div>
      </div>
    )
  }

  const completedTests = tests.filter(t => t.status === 'completed').length
  const totalTests = tests.length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link 
            href="/quality-control/reports"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Informes
          </Link>
          <button
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            onClick={() => alert('Funcionalidad de PDF en desarrollo')}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Informe de Control de Calidad</h1>
        <p className="text-gray-600">Vista preliminar del informe técnico</p>
      </div>

      {/* Información del Proyecto */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Información del Proyecto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Código del Proyecto</p>
            <p className="text-base font-medium text-gray-900">{project.project_code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nombre del Proyecto</p>
            <p className="text-base font-medium text-gray-900">{project.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Dirección</p>
            <p className="text-base font-medium text-gray-900">{project.address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ciudad</p>
            <p className="text-base font-medium text-gray-900">{project.city}</p>
          </div>
        </div>
      </div>

      {/* Información de la Muestra */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Información de la Muestra</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Número de Muestra</p>
            <p className="text-base font-medium text-gray-900">{sample.sample_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Código de Muestra</p>
            <p className="text-base font-medium text-gray-900">{sample.sample_code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tipo de Ensayo</p>
            <p className="text-base font-medium text-gray-900">{sample.template.template_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fecha de Toma</p>
            <p className="text-base font-medium text-gray-900 flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
              {new Date(sample.sample_date).toLocaleDateString('es-CO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ubicación</p>
            <p className="text-base font-medium text-gray-900 flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-gray-400" />
              {sample.location}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estado</p>
            <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(sample.status)}`}>
              {getStatusLabel(sample.status)}
            </span>
          </div>
        </div>

        {sample.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Observaciones</p>
            <p className="text-base text-gray-900">{sample.notes}</p>
          </div>
        )}

        {/* Datos personalizados */}
        {sample.custom_data && Object.keys(sample.custom_data).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Datos Adicionales</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(sample.custom_data).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-gray-500">{key}</p>
                  <p className="text-base font-medium text-gray-900">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resultados de Ensayos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Resultados de Ensayos</h2>
          <div className="text-sm text-gray-600">
            {completedTests} de {totalTests} ensayos completados
          </div>
        </div>

        {tests.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay ensayos registrados para esta muestra</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ensayo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Período (días)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Programada
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Resultado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ensayado por
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Observaciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {test.test_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {test.test_period} días
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(test.test_date).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      {test.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completado
                        </span>
                      ) : test.status === 'in_progress' ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                          En Progreso
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {test.results && test.results.length > 0 ? (
                        <div className="space-y-1">
                          {test.results.map((r, i) => (
                            <div key={i} className="text-xs">
                              #{r.specimen_number}: {r.result_value}
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      -
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {test.results && test.results.length > 0 && test.results[0].notes ? test.results[0].notes : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resultado General */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultado General</h2>
        <div className="flex items-center gap-4">
          {getResultIcon(sample.overall_result)}
          <div>
            <p className="text-sm text-gray-500">Estado Final</p>
            <p className="text-2xl font-bold text-gray-900">{getResultLabel(sample.overall_result)}</p>
          </div>
        </div>
        {sample.overall_result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {sample.overall_result === 'approved' && 'La muestra cumple con los requisitos de calidad establecidos.'}
              {sample.overall_result === 'rejected' && 'La muestra no cumple con los requisitos de calidad establecidos.'}
              {sample.overall_result === 'conditional' && 'La muestra requiere evaluación adicional o cumple condicionalmente.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
