'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Project } from '@/types'
import Link from 'next/link'

type ProjectFormData = {
  name: string
  client_company_id: string
  address: string
  city: string
  start_date?: string
  end_date?: string
  intervention_types: ('supervision_tecnica' | 'interventoria_administrativa')[]
  budget?: number
  description?: string
}

export default function EditProjectPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState<Project | null>(null)
  
  const router = useRouter()
  const params = useParams()
  const { hasPermission, profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      loadProject()
    }
  }, [params.id])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          company:companies!client_company_id(*)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      if (!data) throw new Error('Proyecto no encontrado')

      setProject(data)
    } catch (error: any) {
      console.error('Error loading project:', error)
      setError(error.message || 'Error al cargar el proyecto')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ProjectFormData) => {
    if (!project) return

    setSubmitting(true)
    setError('')

    try {
      // Actualizar el proyecto
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: data.name,
          client_company_id: data.client_company_id,
          address: data.address,
          city: data.city,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          intervention_types: data.intervention_types,
          budget: data.budget || null,
          description: data.description || null
        })
        .eq('id', params.id)

      if (updateError) throw updateError

      // Redirigir al detalle del proyecto
      router.push(`/dashboard/projects/${params.id}`)
    } catch (error: any) {
      console.error('Error updating project:', error)
      setError(error.message || 'Error al actualizar el proyecto')
      throw error
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/dashboard/projects/${params.id}`)
  }

  // Verificar permisos
  if (!hasPermission('projects', 'update')) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            No tienes permisos para editar proyectos.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Link>
        </Button>
      </div>
    )
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
          <AlertDescription>
            {error || 'No se pudo cargar la información del proyecto.'}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${project.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Proyecto
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Proyecto</h1>
            <p className="text-sm text-gray-500">
              Actualiza la información de {project.name}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <ProjectForm
          project={project}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={submitting}
          submitButtonText={submitting ? 'Actualizando...' : 'Actualizar Proyecto'}
        />
        
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
