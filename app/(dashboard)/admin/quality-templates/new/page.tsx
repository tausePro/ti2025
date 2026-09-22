import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QualityTemplateForm } from '@/components/quality-control/admin/QualityTemplateForm'

export default async function NewQualityTemplatePage() {
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Plantilla de Calidad</h1>
      </div>
      <QualityTemplateForm />
    </div>
  )
}
