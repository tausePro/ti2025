'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const handleSubmit = async (data: ProjectFormData) => {
    if (!user) {
      setError('Usuario no autenticado')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Crear el proyecto
      const projectData = {
        name: data.name,
        client_company_id: data.client_company_id,
        address: data.address,
        intervention_types: data.intervention_types,
        status: 'planificacion' as const,
        custom_fields_config: {
          city: data.city,
          description: data.description,
          budget: data.budget,
          start_date: data.start_date,
          end_date: data.end_date
        },
        created_by: user.id
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (projectError) throw projectError

      // Asignar automáticamente al usuario creador como miembro del equipo
      const { error: teamError } = await supabase
        .from('project_team_members')
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: 'supervisor', // Rol por defecto para el creador
          assigned_by: user.id
        })

      if (teamError) {
        console.warn('Error asignando usuario al equipo:', teamError)
        // No fallar por esto, solo advertir
      }

      // Redirigir a la lista de proyectos
      router.push('/dashboard/projects')
    } catch (error: any) {
      console.error('Error creating project:', error)
      setError(error.message || 'Error al crear el proyecto')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/projects')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Proyecto</h1>
            <p className="text-sm text-gray-500">
              Crea un nuevo proyecto de supervisión técnica o interventoría administrativa
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
          submitButtonText={loading ? 'Creando...' : 'Crear Proyecto'}
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
