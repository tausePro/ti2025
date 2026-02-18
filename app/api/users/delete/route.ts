import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario requerido' 
      }, { status: 400 })
    }

    // Verificar autenticación y permisos del usuario actual
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!currentProfile || !['super_admin', 'admin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar usuarios' }, { status: 403 })
    }

    // No permitir eliminarse a sí mismo
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Primero eliminar el perfil (esto debería disparar CASCADE en permisos personalizados)
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json({ 
        error: 'Error al eliminar perfil: ' + profileError.message 
      }, { status: 500 })
    }

    // Luego eliminar el usuario de auth con adminClient
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      return NextResponse.json({
        success: true,
        warning: 'Perfil eliminado pero el usuario puede quedar en autenticación',
        message: 'Usuario eliminado parcialmente'
      })
    }

    console.log('✅ Usuario eliminado completamente:', userId)

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

