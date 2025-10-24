import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TemplatesList } from '@/components/reports/ui/TemplatesList'

export default async function ReportTemplatesPage() {
  const supabase = createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verificar que sea admin
  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Obtener plantillas
  const { data: templates } = await (supabase
    .from('report_templates') as any)
    .select('*')
    .or(`company_id.is.null,company_id.eq.${profile.company_id}`)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Plantillas de Reportes
        </h1>
        <p className="text-gray-600 mt-2">
          Configura las plantillas para generar reportes PDF personalizados
        </p>
      </div>

      <TemplatesList templates={templates || []} />
    </div>
  )
}
