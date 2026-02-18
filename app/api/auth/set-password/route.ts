import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json({ error: 'userId y password son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verificar que el usuario existe
    const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(userId)

    if (getUserError || !userData?.user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Actualizar contraseña usando adminClient (service role, sin depender de sesión del browser)
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
