'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download, Filter, Search, Calendar } from 'lucide-react'
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
  template: {
    template_name: string
    template_type: string
  }
  tests_count?: number
  completed_tests?: number
}

export default function QualityReportsPage() {
  const { user, profile, hasPermission } = useAuth()
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [samples, setSamples] = useState<QualitySample[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (user && profile) {
      loadProjects()
    }
  }, [user, profile])

  useEffect(() => {
    if (selectedProject) {
      loadSamples(selectedProject)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      if (!user?.id) return

      // Si es super_admin, ver todos los proyectos
      if (profile?.role === 'super_admin') {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, project_code')
          .eq('is_archived', false)
          .order('name')

        if (!error && data) {
          setProjects(data)
          if (data.length > 0) {
            setSelectedProject(data[0].id)
          }
        }
        return
      }

      // Para otros roles, obtener proyectos donde es miembro
      const { data: memberData } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const projectIds = memberData?.map(m => m.project_id) || []

      if (projectIds.length === 0) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .in('id', projectIds)
        .eq('is_archived', false)
        .order('name')

      if (!error && data) {
        setProjects(data)
        if (data.length > 0) {
          setSelectedProject(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSamples = async (projectId: string) => {
    try {
      setLoading(true)

      // Cargar muestras con conteo de ensayos
      const { data, error } = await supabase
        .from('quality_control_samples')
        .select(`
          id,
          sample_number,
          sample_code,
          sample_date,
          location,
          status,
          overall_result,
          template:quality_control_templates(
            template_name,
            template_type
          )
        `)
        .eq('project_id', projectId)
        .order('sample_date', { ascending: false })

      if (error) {
        console.error('Error loading samples:', error)
        return
      }

      // Para cada muestra, contar ensayos
      const samplesWithCounts = await Promise.all(
        (data || []).map(async (sample) => {
          const { count: totalTests } = await supabase
            .from('quality_control_tests')
            .select('*', { count: 'exact', head: true })
            .eq('sample_id', sample.id)

          const { count: completedTests } = await supabase
            .from('quality_control_tests')
            .select('*', { count: 'exact', head: true })
            .eq('sample_id', sample.id)
            .not('test_result', 'is', null)

          return {
            ...sample,
            template: Array.isArray(sample.template) ? sample.template[0] : sample.template,
            tests_count: totalTests || 0,
            completed_tests: completedTests || 0
          }
        })
      )

      setSamples(samplesWithCounts as QualitySample[])
    } catch (error) {
      console.error('Error loading samples:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSamples = samples.filter(sample => {
    const matchesSearch = 
      sample.sample_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.sample_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.location.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || sample.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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

  const getResultColor = (result: string | null) => {
    if (!result) return 'bg-gray-100 text-gray-800'
    switch (result) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'conditional': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getResultLabel = (result: string | null) => {
    if (!result) return 'Sin resultado'
    switch (result) {
      case 'approved': return 'Aprobado'
      case 'rejected': return 'Rechazado'
      case 'conditional': return 'Condicional'
      default: return result
    }
  }

  if (loading && projects.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Informes de Control de Calidad</h1>
          <Link 
            href="/quality-control"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Volver a Control de Calidad
          </Link>
        </div>
        <p className="text-gray-600">Vista preliminar de informes y resultados de ensayos</p>
      </div>

      {/* Selector de proyecto */}
      {projects.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 max-w-md">
              {projects.length > 1 ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Proyecto
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccione un proyecto...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.project_code} - {project.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proyecto Actual
                  </label>
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-medium text-gray-900">
                      {projects[0].project_code} - {projects[0].name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros y búsqueda */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por número, código o ubicación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Lista de muestras */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando muestras...</p>
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No se encontraron muestras' : 'No hay muestras registradas'}
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Intenta con otros términos de búsqueda o filtros'
                  : 'Registra muestras desde el módulo de Control de Calidad'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Muestra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ensayos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resultado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSamples.map((sample) => (
                    <tr key={sample.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {sample.sample_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sample.sample_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sample.template?.template_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {sample.template?.template_type || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {new Date(sample.sample_date).toLocaleDateString('es-CO')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sample.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sample.completed_tests || 0} / {sample.tests_count || 0}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ 
                              width: `${sample.tests_count ? (sample.completed_tests || 0) / sample.tests_count * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sample.status)}`}>
                          {getStatusLabel(sample.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getResultColor(sample.overall_result)}`}>
                          {getResultLabel(sample.overall_result)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Link
                            href={`/quality-control/reports/${sample.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver Informe
                          </Link>
                          <button
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            title="Descargar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sin proyectos */}
      {projects.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay proyectos disponibles
          </h3>
          <p className="text-gray-600">
            Necesitas tener al menos un proyecto activo para ver informes
          </p>
        </div>
      )}
    </div>
  )
}
