// Sistema de autenticación temporal para desarrollo
// Este archivo permite probar el formulario sin autenticación completa

import { createClient } from '@/lib/supabase/client'

export async function createDevUser() {
  const supabase = createClient()
  
  try {
    // Crear usuario temporal para desarrollo
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@talentoinmobiliario.com',
      password: 'test123',
      options: {
        data: {
          full_name: 'Administrador'
        }
      }
    })

    if (authError) {
      console.error('Error creando usuario de desarrollo:', authError)
      return null
    }

    // Crear perfil en la tabla profiles
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          full_name: 'Administrador',
          role: 'super_admin',
          is_active: true
        })

      if (profileError) {
        console.error('Error creando perfil:', profileError)
        return null
      }

      console.log('✅ Usuario de desarrollo creado:', authData.user.email)
      return authData.user
    }

    return null
  } catch (error) {
    console.error('Error en createDevUser:', error)
    return null
  }
}

export async function signInDevUser() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@talentoinmobiliario.com',
      password: 'test123'
    })

    if (error) {
      console.error('Error iniciando sesión:', error)
      return null
    }

    console.log('✅ Sesión iniciada:', data.user?.email)
    return data.user
  } catch (error) {
    console.error('Error en signInDevUser:', error)
    return null
  }
}

export async function ensureDevUser() {
  const supabase = createClient()
  
  // Verificar si ya hay un usuario autenticado
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    console.log('✅ Usuario ya autenticado:', user.email)
    return user
  }

  // Intentar iniciar sesión con usuario de desarrollo
  const signedInUser = await signInDevUser()
  if (signedInUser) {
    return signedInUser
  }

  // Si no existe, crear usuario de desarrollo
  const createdUser = await createDevUser()
  if (createdUser) {
    return createdUser
  }

  console.error('❌ No se pudo crear o autenticar usuario de desarrollo')
  return null
}
