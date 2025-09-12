'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, Building2, MapPin, Calendar, Users } from 'lucide-react'
import Link from 'next/link'
import { Project, Company, ProjectStatus, InterventionType } from '@/types'

interface ProjectWithCompany extends Project {
  company: Company
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithCompany[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<InterventionType | 'all'>('all')
  
  const { hasPermission } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    filterProjects()
  }, [projects, searchTerm, statusFilter, typeFilter])

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          company:companies(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterProjects = () => {
    let filtered = projects

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter)
    }

    // Filtro por tipo de intervención
    if (typeFilter !== 'all') {
      filtered = filtered.filter(project => 
        project.intervention_type.includes(typeFilter)
      )
    }

    setFilteredProjects(filtered)
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

  const getInterventionTypeText = (types: InterventionType[]) => {
    return types.map(type => {
      switch (type) {
        case 'supervision_tecnica':
          return 'Supervisión Técnica'
        case 'interventoria_administrativa':
          return 'Interventoría Administrativa'
        default:
          return type
      }
    }).join(', ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona y supervisa todos los proyectos de construcción
          </p>
        </div>
        {hasPermission('projects', 'create') && (
          <Button asChild className="mt-4 sm:mt-0">
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: ProjectStatus | 'all') => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="planificacion">Planificación</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(value: InterventionType | 'all') => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de intervención" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="supervision_tecnica">Supervisión Técnica</SelectItem>
                <SelectItem value="interventoria_administrativa">Interventoría Administrativa</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/dashboard/projects/${project.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.company?.name}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {getStatusText(project.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Address */}
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="line-clamp-1">{project.address}</span>
                  </div>

                  {/* Intervention Types */}
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {getInterventionTypeText(project.intervention_type)}
                    </span>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      Creado: {new Date(project.created_at).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron proyectos
            </h3>
            <p className="text-gray-500 text-center mb-6">
              {projects.length === 0 
                ? 'Aún no hay proyectos creados. Crea tu primer proyecto para comenzar.'
                : 'No hay proyectos que coincidan con los filtros aplicados.'
              }
            </p>
            {hasPermission('projects', 'create') && projects.length === 0 && (
              <Button asChild>
                <Link href="/dashboard/projects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Proyecto
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
