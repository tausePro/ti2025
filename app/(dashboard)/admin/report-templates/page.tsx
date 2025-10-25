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

  // Obtener perfil y permisos
  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/dashboard')
  }

  // Admin y super_admin siempre tienen acceso
  const isAdmin = ['super_admin', 'admin'].includes(profile.role)
  
  if (!isAdmin) {
    // Para otros roles, verificar permisos
    const { data: permissions, error: permError } = await (supabase
      .from('role_permissions') as any)
      .select('*')
      .eq('role', profile.role)
      .eq('module', 'plantillas_pdf')
      .eq('action', 'read')
      .eq('allowed', true)
      .maybeSingle()

    // Si no tiene permisos o hay error, redirigir
    if (!permissions || permError) {
      console.log('❌ Sin permisos para plantillas_pdf:', { role: profile.role, error: permError })
      redirect('/dashboard')
    }
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
