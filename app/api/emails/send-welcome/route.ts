import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendTemplateEmail } from '@/lib/emails/sendTemplateEmail'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    type TargetProfile = {
      id: string
      full_name: string
      email: string
      role: string
    }

    const { data: targetProfile, error: targetError } = await (adminClient
      .from('profiles')
      .select('id, full_name, email, role') as any)
      .eq('id', userId)
      .single()

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beta.talentoinmobiliario.com'
    const loginUrl = `${appUrl}/login`
    const redirectTo = `${appUrl}/api/auth/callback?next=/confirm`
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: targetProfile.email,
      options: {
        redirectTo
      }
    })

    if (linkError) {
      throw new Error(`No se pudo generar el enlace de contraseña: ${linkError.message}`)
    }

    const setPasswordUrl = linkData?.properties?.action_link
    if (!setPasswordUrl) {
      throw new Error('No se recibió action_link para crear contraseña')
    }

    await sendTemplateEmail({
      templateType: 'welcome_user',
      to: targetProfile.email,
      variables: {
        full_name: targetProfile.full_name,
        email: targetProfile.email,
        company_name: 'Talento Inmobiliario',
        project_name: '',
        login_url: loginUrl,
        role: targetProfile.role,
        set_password_url: setPasswordUrl
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error enviando bienvenida:', error)
    return NextResponse.json({ error: error.message || 'Error enviando correo' }, { status: 500 })
  }
}
