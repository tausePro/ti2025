import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QualityTemplatesList, type QualityTemplateRow } from '@/components/quality-control/admin/QualityTemplatesList'

export default async function QualityTemplatesPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    redirect('/login')
  }

  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: templates } = await (supabase.from('quality_control_templates') as any)
    .select('id, template_name, template_type, description, is_active, is_global, custom_fields, test_configuration, samples:quality_control_samples(count)')
    .order('template_type')
    .order('template_name')

  const rows: QualityTemplateRow[] = (templates || []).map((t: any) => ({
    ...t,
    samples_count: t.samples?.[0]?.count ?? 0
  }))

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Plantillas de Control de Calidad
        </h1>
        <p className="text-gray-600 mt-2">
          Configura los formatos de ensayo (concreto, acero, morteros, presurizaciones, etc.) sin necesidad de migraciones
        </p>
      </div>

      <QualityTemplatesList templates={rows} />
    </div>
  )
}
