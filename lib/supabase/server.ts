import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Cliente de administración con Service Role Key
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Funciones para Server Components
export const serverAuth = {
  getUser: async () => {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { user: null, profile: null }
    }
    
    // Obtener datos completos del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      return { user, profile: null }
    }
    
    return { user, profile: userData }
  },

  getUserPermissions: async (userId: string) => {
    const supabase = createClient()
    
    // Obtener rol del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (userError) return []
    
    // Obtener permisos del rol
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', (userData as any).role)
      .eq('allowed', true)
    
    if (permError) return []
    
    return permissions || []
  },

  checkPermission: async (userId: string, module: string, action: string) => {
    const permissions = await serverAuth.getUserPermissions(userId)
    return permissions.some((p: any) => p.module === module && p.action === action)
  }
}
