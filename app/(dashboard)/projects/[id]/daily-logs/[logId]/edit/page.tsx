import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DailyLogFormTabs from '@/components/daily-logs/DailyLogFormTabs'

export default async function EditDailyLogPage({ 
  params 
}: { 
  params: { id: string; logId: string } 
}) {
  const supabase = createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (\!user) {
    redirect('/login')
  }

  // Obtener proyecto
  const { data: project, error: projectError } = await (supabase
    .from('projects') as any)
    .select('*')
    .eq('id', params.id)
    .single()

  if (projectError || \!project) {
    redirect('/projects')
  }

  // Obtener bitácora
  const { data: log, error: logError } = await (supabase
    .from('daily_logs') as any)
    .select('*')
    .eq('id', params.logId)
    .single()

  if (logError || \!log) {
    redirect(`/projects/${params.id}/daily-logs`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Editar Bitácora</h1>
        <p className="text-gray-600 mt-2">
          Proyecto: {project.name}
        </p>
      </div>

      <DailyLogFormTabs 
        projectId={params.id}
        logId={params.logId}
      />
    </div>
  )
}
