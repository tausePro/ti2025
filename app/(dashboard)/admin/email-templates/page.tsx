import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function EmailTemplatesPage() {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profileError) {
    redirect('/dashboard')
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile.role)

  if (!isAdmin) {
    const { data: permissions, error: permError } = await (supabase
      .from('role_permissions') as any)
      .select('*')
      .eq('role', profile.role)
      .eq('module', 'plantillas_email')
      .eq('action', 'read')
      .eq('allowed', true)
      .maybeSingle()

    if (!permissions || permError) {
      redirect('/dashboard')
    }
  }

  const { data: templates } = await (supabase
    .from('email_templates') as any)
    .select('*')
    .order('template_name', { ascending: true })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plantillas de Email</h1>
          <p className="text-gray-600 mt-2">Configura los correos automáticos del sistema</p>
        </div>
        <Button asChild>
          <Link href="/admin/email-templates/new">Nueva Plantilla</Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(templates || []).map((template: any) => (
              <tr key={template.id}>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{template.template_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{template.template_type}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {template.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <Link className="text-blue-600 hover:underline" href={`/admin/email-templates/${template.id}`}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
