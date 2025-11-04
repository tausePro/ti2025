import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente simple sin SSR para evitar problemas de cookies
export function createClient() {
  if (typeof window === 'undefined') {
    // En el servidor, usar cliente básico sin opciones
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // En el cliente, usar con persistencia
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    }
  )
}
