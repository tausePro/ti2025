import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { UserRole } from '@/types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Funciones de autenticación
export const auth = {
  signIn: async (email: string, password: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    // Obtener datos completos del usuario desde la tabla profiles
    if (data.user) {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      if (userError) throw userError
      
      return { user: data.user, profile: userData }
    }
    
    return { user: data.user, profile: null }
  },

  signUp: async (email: string, password: string, fullName: string, role: UserRole = 'cliente') => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    
    if (error) throw error
    
    // Crear registro en la tabla profiles
    if (data.user) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          role,
          is_active: true
        } as any)
      
      if (insertError) throw insertError
    }
    
    return data
  },

  signOut: async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  getUser: async () => {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) throw error
    
    if (user) {
      // Obtener datos completos del usuario
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (userError) throw userError
      
      return { user, profile: userData }
    }
    
    return { user: null, profile: null }
  },

  getUserPermissions: async (userId: string) => {
    const supabase = createClient()
    
    // Obtener rol del usuario
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (userError) throw userError
    
    // Obtener permisos del rol
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', (userData as any).role)
      .eq('allowed', true)
    
    if (permError) throw permError
    
    return permissions || []
  }
}
