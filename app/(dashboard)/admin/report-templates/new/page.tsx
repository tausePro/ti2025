import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TemplateForm } from '@/components/reports/ui/TemplateForm'

export default async function NewTemplatePage() {
  const supabase = createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Obtener perfil y permisos
  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/dashboard')
  }

  // Verificar permisos para crear plantillas
  const { data: permissions } = await (supabase
    .from('role_permissions') as any)
    .select('*')
    .eq('role', profile.role)
    .eq('module', 'plantillas_pdf')
    .eq('action', 'create')
    .eq('allowed', true)
    .single()

  // Si no tiene permisos, redirigir
  if (!permissions && !['super_admin', 'admin'].includes(profile.role)) {
    redirect('/admin/report-templates')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Nueva Plantilla de Reporte
        </h1>
        <p className="text-gray-600 mt-2">
          Configura una nueva plantilla para generar reportes PDF
        </p>
      </div>

      <TemplateForm companyId={profile.company_id} userId={user.id} />
    </div>
  )
}
