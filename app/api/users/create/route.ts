import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendTemplateEmail } from '@/lib/emails/sendTemplateEmail'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, full_name, phone, role, professional_license, is_active } = body

    // Validar datos requeridos
    if (!email || !full_name || !role) {
      return NextResponse.json({ 
        error: 'Email, nombre completo y rol son requeridos' 
      }, { status: 400 })
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'El formato del email no es válido' 
      }, { status: 400 })
    }

    // Verificar que el usuario actual esté autenticado y tenga permisos
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'No autenticado' 
      }, { status: 401 })
    }

    // Verificar que el usuario tenga rol permitido para crear usuarios
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!profile || !['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)) {
      return NextResponse.json({ 
        error: 'No tienes permisos para crear usuarios' 
      }, { status: 403 })
    }

    // Usar cliente admin para crear usuario
    const adminClient = createAdminClient()

    // Generar contraseña temporal
    const tempPassword = `Temp${Date.now()}!`
    
    // Crear usuario en Supabase Auth usando adminClient
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json({ 
        error: 'Error al crear usuario: ' + authError.message 
      }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ 
        error: 'No se pudo crear el usuario' 
      }, { status: 500 })
    }

    console.log('✅ Usuario creado en auth:', authData.user.id)

    // Actualizar perfil en la tabla profiles usando adminClient
    // Usamos upsert porque el trigger ya creó el perfil básico
    const profileData = {
      id: authData.user.id,
      email,
      full_name,
      phone: phone || null,
      role,
      professional_license: professional_license || null,
      is_active: is_active !== false
    }
    
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(profileData as any, { onConflict: 'id' })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      
      // Intentar limpiar el usuario de auth si falló la creación del perfil
      try {
        await adminClient.auth.admin.deleteUser(authData.user.id)
        console.log('🧹 Usuario de auth eliminado después del error')
      } catch (cleanupError) {
        console.error('Error limpiando usuario de auth:', cleanupError)
      }
      
      return NextResponse.json({ 
        error: 'Error al crear perfil: ' + profileError.message 
      }, { status: 500 })
    }

    console.log('✅ Perfil creado exitosamente')

    let welcomeEmailSent = false
    let welcomeEmailError: string | null = null

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beta.talentoinmobiliario.com'
      const appOrigin = new URL(appUrl).origin
      const loginUrl = `${appOrigin}/login`
      const redirectTo = `${appOrigin}/confirm`
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo
        }
      })

      if (linkError) {
        throw new Error(`No se pudo generar el enlace de contraseña: ${linkError.message}`)
      }

      const hashedToken = linkData?.properties?.hashed_token
      if (!hashedToken) {
        throw new Error('No se recibió hashed_token para crear contraseña')
      }
      const setPasswordUrl = `${appOrigin}/confirm?token_hash=${hashedToken}&type=recovery`

      await sendTemplateEmail({
        templateType: 'welcome_user',
        to: email,
        variables: {
          full_name,
          email,
          company_name: 'Talento Inmobiliario',
          project_name: '',
          login_url: loginUrl,
          role,
          set_password_url: setPasswordUrl
        }
      })
      welcomeEmailSent = true
    } catch (emailError) {
      console.error('Error enviando correo de bienvenida:', emailError)
      welcomeEmailError = emailError instanceof Error ? emailError.message : 'Error desconocido enviando bienvenida'
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        full_name,
        role,
        is_active: is_active !== false
      },
      message: welcomeEmailSent
        ? 'Usuario creado y correo de bienvenida enviado exitosamente'
        : 'Usuario creado, pero no se pudo enviar el correo de bienvenida. Reintenta desde la lista de usuarios.',
      email_sent: welcomeEmailSent,
      email_error: welcomeEmailError
    })

  } catch (error) {
    console.error('Error in create user API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

