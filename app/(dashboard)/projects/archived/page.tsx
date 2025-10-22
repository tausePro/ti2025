'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Building2, Grid, List, Archive } from 'lucide-react'
import Link from 'next/link'
import { Project, ProjectFilters } from '@/types'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectFilters as ProjectFiltersComponent } from '@/components/projects/ProjectFilters'

export default function ArchivedProjectsPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: 'all',
    interventionType: 'all',
    clientId: 'all',
    dateRange: null,
    progressRange: null
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
    includeArchived: true // Solo archivados
  })

  // Filtrar solo archivados
  const archivedProjects = projects.filter(p => p.is_archived)

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
    router.push(`/projects/${project.id}/team`)
  }

  const handleGenerateReport = (project: Project) => {
    router.push(`/projects/${project.id}/reports`)
  }

  const handleViewFinancial = (project: Project) => {
    router.push(`/projects/${project.id}/financial`)
  }

  const handleDeleteProject = async (project: Project) => {
    const confirmMessage = `¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?\n\nEsta acción NO se puede deshacer y eliminará:\n- Todas las bitácoras\n- Todos los reportes\n- Todas las órdenes de pago\n- Todo el equipo asignado\n\nEscribe "ELIMINAR" para confirmar:`
    
    const confirmation = prompt(confirmMessage)
    
    if (confirmation !== 'ELIMINAR') {
      if (confirmation !== null) {
        alert('❌ Debes escribir "ELIMINAR" exactamente para confirmar.')
      }
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error

      alert('✅ Proyecto eliminado exitosamente')
      refreshProjects()
    } catch (error: any) {
      console.error('Error deleting project:', error)
      alert(`❌ Error al eliminar proyecto: ${error.message}`)
    }
  }

  const handleArchiveProject = async (project: Project) => {
    const isArchived = project.is_archived
    const action = isArchived ? 'desarchivar' : 'archivar'
    const confirmMessage = `¿Estás seguro de que deseas ${action} el proyecto "${project.name}"?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: !isArchived })
        .eq('id', project.id)

      if (error) throw error

      alert(`✅ Proyecto ${isArchived ? 'desarchivado' : 'archivado'} exitosamente`)
      refreshProjects()
    } catch (error: any) {
      console.error('Error archiving project:', error)
      alert(`❌ Error al ${action} proyecto: ${error.message}`)
    }
  }

  const handleDuplicateProject = (project: Project) => {
    // TODO: Implementar duplicar proyecto
    console.log('Duplicate project:', project.id)
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
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Proyectos
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="h-6 w-6 text-orange-600" />
            Proyectos Archivados
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {archivedProjects.length} proyectos archivados
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
        </div>
      </div>

      {/* Filtros */}
      <ProjectFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
      />

      {/* Proyectos archivados */}
      {archivedProjects.length > 0 ? (
        <div className={
          viewMode === 'cards' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {archivedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={hasPermission('projects', 'update') ? handleEditProject : undefined}
              onAssignTeam={hasPermission('projects', 'update') ? handleAssignTeam : undefined}
              onGenerateReport={hasPermission('reports', 'create') ? handleGenerateReport : undefined}
              onViewFinancial={hasPermission('financial', 'read') ? handleViewFinancial : undefined}
              onArchive={hasPermission('projects', 'delete') ? handleArchiveProject : undefined}
              onDuplicate={hasPermission('projects', 'create') ? handleDuplicateProject : undefined}
              onDelete={hasPermission('projects', 'delete') ? handleDeleteProject : undefined}
              showActions={true}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Archive className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay proyectos archivados
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Los proyectos archivados aparecerán aquí.
            </p>
            <Button asChild variant="outline">
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Proyectos
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
