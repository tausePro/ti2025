import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario requerido' 
      }, { status: 400 })
    }

    const supabase = createClient()

    // Primero eliminar el perfil (esto debería disparar CASCADE en permisos personalizados)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json({ 
        error: 'Error al eliminar perfil: ' + profileError.message 
      }, { status: 500 })
    }

    // Luego intentar eliminar el usuario de auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      // No retornamos error aquí porque el perfil ya fue eliminado
      // El usuario quedará en auth pero sin perfil (inconsistencia menor)
      return NextResponse.json({
        success: true,
        warning: 'Usuario eliminado del sistema pero puede quedar en la autenticación',
        message: 'Usuario eliminado parcialmente'
      })
    }

    console.log('✅ Usuario eliminado completamente')

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

