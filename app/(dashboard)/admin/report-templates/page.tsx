import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TemplatesList } from '@/components/reports/ui/TemplatesList'

export default async function ReportTemplatesPage() {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  console.log('🔍 [SERVER] Verificando autenticación:', { 
    hasUser: !!user, 
    userId: user?.id,
    authError: authError?.message 
  })
  
  if (!user || authError) {
    console.log('❌ [SERVER] No autenticado, redirigiendo a login')
    redirect('/login')
  }

  // Obtener perfil
  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('🔍 [SERVER] Perfil obtenido:', { 
    hasProfile: !!profile, 
    role: profile?.role,
    profileError: profileError?.message 
  })

  if (!profile || profileError) {
    console.log('❌ [SERVER] Sin perfil, redirigiendo a dashboard')
    redirect('/dashboard')
  }

  // Admin y super_admin siempre tienen acceso
  const isAdmin = ['super_admin', 'admin'].includes(profile.role)
  
  console.log('🔍 [SERVER] Verificando acceso:', { 
    role: profile.role, 
    isAdmin,
    needsPermissionCheck: !isAdmin 
  })
  
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

    console.log('🔍 [SERVER] Permisos verificados:', { 
      hasPermissions: !!permissions, 
      permError: permError?.message 
    })

    // Si no tiene permisos o hay error, redirigir
    if (!permissions || permError) {
      console.log('❌ [SERVER] Sin permisos, redirigiendo a dashboard')
      redirect('/dashboard')
    }
  } else {
    console.log('✅ [SERVER] Acceso concedido por rol admin/super_admin')
  }

  // Obtener plantillas (todas las globales por ahora)
  const { data: templates } = await (supabase
    .from('report_templates') as any)
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Plantillas de Informes
        </h1>
        <p className="text-gray-600 mt-2">
          Configura las plantillas para generar informes PDF personalizados
        </p>
      </div>

      <TemplatesList templates={templates || []} />
    </div>
  )
}
