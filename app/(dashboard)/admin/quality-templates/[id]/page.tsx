import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QualityTemplateForm } from '@/components/quality-control/admin/QualityTemplateForm'

export default async function EditQualityTemplatePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const { data: template, error } = await (supabase.from('quality_control_templates') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (error || !template) {
    redirect('/admin/quality-templates')
  }

  const { count: samplesCount } = await (supabase.from('quality_control_samples') as any)
    .select('id', { count: 'exact', head: true })
    .eq('template_id', id)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Editar Plantilla de Calidad</h1>
        <p className="text-gray-600 mt-2">{template.template_name}</p>
      </div>
      <QualityTemplateForm template={template} samplesCount={samplesCount || 0} />
    </div>
  )
}
