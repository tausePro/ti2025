'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, FileText } from 'lucide-react'
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
}

export default function QualityControlPage() {
  const { profile, hasPermission } = useAuth()
  const supabase = createClientComponentClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [samples, setSamples] = useState<QualitySample[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Cargar proyectos
  useEffect(() => {
    loadProjects()
  }, [])

  // Cargar muestras cuando se selecciona un proyecto
  useEffect(() => {
    if (selectedProject) {
      loadSamples(selectedProject)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      // Obtener el user_id actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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

      // Para otros roles, solo proyectos donde es miembro activo
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .in('id', `
          SELECT project_id 
          FROM project_members 
          WHERE user_id = '${user.id}' 
          AND is_active = true
        `)
        .eq('is_archived', false)
        .order('name')

      if (error) {
        console.error('Error loading projects:', error)
        return
      }

      setProjects(data || [])
      
      // Si solo tiene un proyecto, seleccionarlo automáticamente
      if (data && data.length === 1) {
        setSelectedProject(data[0].id)
      } else if (data && data.length > 1) {
        // Si tiene múltiples proyectos, mostrar selector
        setSelectedProject('')
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadSamples = async (projectId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('quality_control_samples')
        .select(`
          *,
          template:quality_control_templates(template_name, template_type)
        `)
        .eq('project_id', projectId)
        .order('sample_date', { ascending: false })

      if (error) throw error
      setSamples(data || [])
    } catch (error) {
      console.error('Error loading samples:', error)
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

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getResultBadge = (result: string | null) => {
    if (!result) return null
    
    const styles = {
      'CUMPLE': 'bg-green-100 text-green-800 border-green-200',
      'NO CUMPLE': 'bg-red-100 text-red-800 border-red-200',
      'ENVIAR TESTIGOS': 'bg-orange-100 text-orange-800 border-orange-200'
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded border ${styles[result as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {result}
      </span>
    )
  }

  const filteredSamples = samples.filter(sample =>
    sample.sample_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sample.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sample.template.template_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const canCreate = hasPermission('control_calidad', 'create')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Control de Calidad</h1>
        <p className="text-gray-600">Gestión de muestras y ensayos de calidad en obra</p>
      </div>

      {/* Selector de proyecto y acciones */}
      {projects.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
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
                  <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="font-medium text-gray-900">
                      {projects[0].project_code} - {projects[0].name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {canCreate && selectedProject && (
                <Link href={`/quality-control/${selectedProject}/new`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Muestra
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda y filtros */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por número de muestra, ubicación o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Lista de muestras */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando muestras...</p>
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron muestras' : 'No hay muestras registradas'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda' 
                  : 'Comienza registrando la primera muestra de control de calidad'
                }
              </p>
              {canCreate && !searchTerm && (
                <Link href={`/quality-control/${selectedProject}/new`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Primera Muestra
                  </Button>
                </Link>
              )}
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
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resultado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSamples.map((sample) => (
                    <tr key={sample.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{sample.sample_number}
                        </div>
                        {sample.sample_code && (
                          <div className="text-xs text-gray-500">{sample.sample_code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{sample.template.template_name}</div>
                        <div className="text-xs text-gray-500 capitalize">{sample.template.template_type}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{sample.location || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(sample.sample_date).toLocaleDateString('es-CO')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(sample.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getResultBadge(sample.overall_result)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/quality-control/${selectedProject}/${sample.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sin proyecto seleccionado */}
      {!selectedProject && projects.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay proyectos disponibles</h3>
          <p className="text-gray-600">
            Necesitas tener al menos un proyecto activo para gestionar el control de calidad
          </p>
        </div>
      )}
    </div>
  )
}
