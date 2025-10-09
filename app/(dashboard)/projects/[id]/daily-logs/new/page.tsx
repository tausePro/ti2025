import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DailyLogForm from '@/components/daily-logs/DailyLogForm'

export default async function NewDailyLogPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Obtener proyecto
  const { data: project, error: projectError } = await (supabase
    .from('projects') as any)
    .select('*')
    .eq('id', params.id)
    .single()

  if (projectError || !project) {
    redirect('/projects')
  }

  // Obtener template del proyecto
  const { data: template } = await (supabase
    .from('daily_log_templates') as any)
    .select('*')
    .eq('project_id', params.id)
    .eq('is_active', true)
    .single()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Bitácora Diaria</h1>
        <p className="text-gray-600 mt-2">
          Proyecto: {project.name}
        </p>
      </div>

      <DailyLogForm 
        projectId={params.id} 
        templateId={template?.id}
      />
    </div>
  )
}
