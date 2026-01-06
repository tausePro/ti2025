'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ClipboardList, 
  Plus, 
  Building2, 
  Calendar,
  ChevronRight,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface ProjectWithLogs {
  id: string
  name: string
  project_code: string
  status: string
  company?: {
    name: string
  }
  daily_logs_count: number
  last_log_date?: string
}

export default function DailyLogsPage() {
  const [projects, setProjects] = useState<ProjectWithLogs[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    loadUserProjects()
  }, [profile?.id])

  const loadUserProjects = async () => {
    if (!profile?.id) return

    try {
      // Obtener proyectos donde el usuario es miembro
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select(`
          project_id,
          role_in_project,
          project:projects(
            id,
            name,
            project_code,
            status,
            company:companies!client_company_id(name)
          )
        `)
        .eq('user_id', profile.id)
        .eq('is_active', true)

      if (memberError) throw memberError

      // Obtener conteo de bitácoras y última fecha para cada proyecto
      const projectsWithLogs = await Promise.all(
        (memberProjects || []).map(async (mp: any) => {
          const project = mp.project
          if (!project) return null

          const { count } = await supabase
            .from('daily_logs')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)

          const { data: lastLog } = await supabase
            .from('daily_logs')
            .select('date')
            .eq('project_id', project.id)
            .order('date', { ascending: false })
            .limit(1)
            .single()

          return {
            ...project,
            daily_logs_count: count || 0,
            last_log_date: lastLog?.date
          }
        })
      )

      setProjects(projectsWithLogs.filter(Boolean) as ProjectWithLogs[])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo':
        return 'bg-green-100 text-green-800'
      case 'pausado':
        return 'bg-yellow-100 text-yellow-800'
      case 'finalizado':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-talento-green" />
          Registro Diario
        </h1>
        <p className="text-gray-600 mt-2">
          Accede rápidamente a las bitácoras de tus proyectos asignados
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes proyectos asignados
            </h3>
            <p className="text-gray-600">
              Contacta a tu supervisor para ser asignado a un proyecto
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                    <CardDescription className="truncate">
                      {project.project_code}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {project.company && (
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {project.company.name}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="h-4 w-4" />
                    {project.daily_logs_count} registros
                  </span>
                  {project.last_log_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(project.last_log_date).toLocaleDateString('es-CO')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1" variant="outline">
                    <Link href={`/projects/${project.id}/daily-logs`}>
                      Ver bitácoras
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href={`/projects/${project.id}/daily-logs/new`}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nueva
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
