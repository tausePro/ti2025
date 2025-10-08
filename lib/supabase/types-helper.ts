/**
 * Helper types para trabajar con Supabase
 * Evita errores de tipos cuando Supabase no puede inferir correctamente
 */

export type SupabaseAny = any

export function asSupabaseInsert<T>(data: T): SupabaseAny {
  return data as SupabaseAny
}

export function asSupabaseData<T>(data: unknown): T {
  return data as T
}
