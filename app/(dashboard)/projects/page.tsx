'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Building2, Grid, List, Download } from 'lucide-react'
import Link from 'next/link'
import { Project, ProjectFilters } from '@/types'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectFilters as ProjectFiltersComponent } from '@/components/projects/ProjectFilters'

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: 'all',
    intervention_type: 'all',
    client_id: 'all'
  })
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; logo_url?: string }>>([])
  
  const { hasPermission } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const { 
    projects, 
    loading, 
    error, 
    totalCount, 
    hasMore, 
    refreshProjects 
  } = useProjects({
    page: 1,
    pageSize: 20,
    filters,
    includeArchived: false
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const handleEditProject = (project: Project) => {
    router.push(`/projects/${project.id}/edit`)
  }

  const handleAssignTeam = (project: Project) => {
    // TODO: Implementar modal de asignación de equipo
    console.log('Assign team to project:', project.id)
  }

  const handleGenerateReport = (project: Project) => {
    router.push(`/projects/${project.id}/reports`)
  }

  const handleViewFinancial = (project: Project) => {
    router.push(`/projects/${project.id}/financial`)
  }

  const handleArchiveProject = (project: Project) => {
    // TODO: Implementar archivar proyecto
    console.log('Archive project:', project.id)
  }

  const handleDuplicateProject = (project: Project) => {
    // TODO: Implementar duplicar proyecto
    console.log('Duplicate project:', project.id)
  }

  const handleExportProjects = () => {
    // TODO: Implementar exportación a Excel
    console.log('Export projects to Excel')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error al cargar proyectos
          </h3>
          <p className="text-gray-500 text-center mb-6">
            {error}
          </p>
          <Button onClick={refreshProjects}>
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Proyectos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalCount} proyectos • {projects.filter(p => p.status === 'activo').length} activos
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          {/* Toggle de vista */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Botón de exportar */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportProjects}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          {/* Botón de nuevo proyecto */}
          {hasPermission('projects', 'create') && (
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proyecto
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <ProjectFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
        loading={loading}
      />

      {/* Proyectos */}
      {projects.length > 0 ? (
        <div className={
          viewMode === 'cards' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={hasPermission('projects', 'update') ? handleEditProject : undefined}
              onAssignTeam={hasPermission('projects', 'update') ? handleAssignTeam : undefined}
              onGenerateReport={hasPermission('reports', 'create') ? handleGenerateReport : undefined}
              onViewFinancial={hasPermission('financial', 'read') ? handleViewFinancial : undefined}
              onArchive={hasPermission('projects', 'delete') ? handleArchiveProject : undefined}
              onDuplicate={hasPermission('projects', 'create') ? handleDuplicateProject : undefined}
              showActions={true}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron proyectos
            </h3>
            <p className="text-gray-500 text-center mb-6">
              {totalCount === 0 
                ? 'Aún no hay proyectos creados. Crea tu primer proyecto para comenzar.'
                : 'No hay proyectos que coincidan con los filtros aplicados.'
              }
            </p>
            {hasPermission('projects', 'create') && totalCount === 0 && (
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Proyecto
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cargar más */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => {/* TODO: Implementar paginación */}}>
            Cargar más proyectos
          </Button>
        </div>
      )}
    </div>
  )
}
