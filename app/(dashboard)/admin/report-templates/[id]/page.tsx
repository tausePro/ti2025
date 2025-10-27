import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplateForm } from '@/components/reports/ui/TemplateForm'

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/dashboard')
  }

  // Verificar permisos
  const { data: permission } = await supabase
    .from('role_permissions')
    .select('allowed')
    .eq('role', profile.role)
    .eq('module', 'plantillas_pdf')
    .eq('action', 'update')
    .maybeSingle()

  const hasPermission = profile.role === 'admin' || profile.role === 'super_admin' || permission?.allowed

  if (!hasPermission) {
    redirect('/dashboard')
  }

  // Obtener la plantilla
  const { data: template, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !template) {
    redirect('/dashboard/admin/report-templates')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Plantilla de Informe</h1>
        <p className="text-gray-600 mt-1">
          Modifica la configuración de la plantilla &quot;{template.template_name}&quot;
        </p>
      </div>

      <TemplateForm 
        template={template}
        companyId={template.company_id}
        userId={user.id}
      />
    </div>
  )
}
