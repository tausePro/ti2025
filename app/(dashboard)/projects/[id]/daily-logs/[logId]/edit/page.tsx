import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DailyLogFormTabs from '@/components/daily-logs/DailyLogFormTabs'
import { canEditDailyLog } from '@/lib/daily-log-permissions'

export default async function EditDailyLogPage({ 
  params 
}: { 
  params: Promise<{ id: string; logId: string }> 
}) {
  const { id, logId } = await params
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Obtener proyecto
  const { data: project, error: projectError } = await (supabase
    .from('projects') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    redirect('/projects')
  }

  // Obtener bitácora
  const { data: log, error: logError } = await (supabase
    .from('daily_logs') as any)
    .select('*')
    .eq('id', logId)
    .single()

  if (logError || !log) {
    redirect(`/projects/${id}/daily-logs`)
  }

  // El residente puede ver bitácoras de compañeros, pero solo editar las suyas
  const { data: currentProfile } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  if (!canEditDailyLog({ id: user.id, role: currentProfile?.role }, log)) {
    redirect(`/projects/${id}/daily-logs/${logId}`)
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
        projectId={id}
        logId={logId}
      />
    </div>
  )
}
