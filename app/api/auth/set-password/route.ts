import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { token_hash, type, password } = await request.json()

    if (!token_hash || !type || !password) {
      return NextResponse.json({ error: 'token_hash, type y password son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Verificar el token en el servidor (NO en el browser)
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email'
    })

    if (otpError) {
      console.error('❌ Error verificando token:', otpError)
      return NextResponse.json({ error: 'El enlace ha expirado o no es válido. Solicita uno nuevo al administrador.' }, { status: 400 })
    }

    if (!otpData?.user?.id) {
      return NextResponse.json({ error: 'No se pudo verificar tu identidad.' }, { status: 400 })
    }

    const userId = otpData.user.id

    // Actualizar contraseña usando adminClient (service role)
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password
    })

    if (updateError) {
      console.error('Error actualizando contraseña:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('✅ Contraseña actualizada para usuario:', userId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error en set-password:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
