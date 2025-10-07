import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, email, full_name, phone, role, professional_license, is_active } = body

    if (!id) {
      return NextResponse.json({ 
        error: 'ID de usuario requerido' 
      }, { status: 400 })
    }

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

    const supabase = createClient()

    // Obtener datos originales del usuario
    const { data: originalUser, error: fetchError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado' 
      }, { status: 404 })
    }

    // Actualizar perfil en la tabla profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        email,
        full_name,
        phone: phone || null,
        role,
        professional_license: professional_license || null,
        is_active: is_active !== false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json({ 
        error: 'Error al actualizar perfil: ' + profileError.message 
      }, { status: 500 })
    }

    // Si el email cambió, actualizar en Supabase Auth
    if (originalUser.email !== email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        email
      })

      if (authError) {
        console.error('Error updating auth email:', authError)
        return NextResponse.json({ 
          error: 'Perfil actualizado pero email no cambió en autenticación: ' + authError.message 
        }, { status: 500 })
      }
    }

    console.log('✅ Usuario actualizado exitosamente')

    return NextResponse.json({
      success: true,
      user: {
        id,
        email,
        full_name,
        role,
        is_active: is_active !== false
      },
      message: 'Usuario actualizado exitosamente'
    })

  } catch (error) {
    console.error('Error in update user API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

