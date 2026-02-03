import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailTemplateForm } from '@/components/emails/EmailTemplateForm'

export default async function NewEmailTemplatePage() {
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
      .eq('action', 'create')
      .eq('allowed', true)
      .maybeSingle()

    if (!permissions || permError) {
      redirect('/admin/email-templates')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Plantilla Email</h1>
        <p className="text-gray-600">Configura una nueva plantilla de correo</p>
      </div>
      <EmailTemplateForm redirectTo="/admin/email-templates" />
    </div>
  )
}
