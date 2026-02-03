import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailTemplateForm } from '@/components/emails/EmailTemplateForm'

export default async function EditEmailTemplatePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/dashboard')
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile.role)
  if (!isAdmin) {
    const { data: permissions, error: permError } = await (supabase
      .from('role_permissions') as any)
      .select('*')
      .eq('role', profile.role)
      .eq('module', 'plantillas_email')
      .eq('action', 'update')
      .eq('allowed', true)
      .maybeSingle()

    if (!permissions || permError) {
      redirect('/admin/email-templates')
    }
  }

  const { data: template, error } = await (supabase
    .from('email_templates') as any)
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !template) {
    redirect('/admin/email-templates')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Plantilla Email</h1>
        <p className="text-gray-600">Modifica la plantilla "{template.template_name}"</p>
      </div>
      <EmailTemplateForm template={template} redirectTo="/admin/email-templates" />
    </div>
  )
}
