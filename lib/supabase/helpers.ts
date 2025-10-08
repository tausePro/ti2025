/**
 * Helpers para trabajar con Supabase y evitar errores de tipos
 * Después de actualizar @supabase/ssr, los tipos no se infieren correctamente
 */

import { createClient } from './client'
import type { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type TableName = keyof Tables

/**
 * Helper para hacer queries SELECT con tipos correctos
 */
export async function selectFrom<T extends TableName>(
  table: T,
  query: string = '*'
) {
  const supabase = createClient()
  return (supabase.from(table as any).select(query) as any)
}

/**
 * Helper para hacer INSERT con tipos correctos
 */
export async function insertInto<T extends TableName>(
  table: T,
  data: any
) {
  const supabase = createClient()
  return (supabase.from(table as any).insert(data) as any)
}

/**
 * Helper para hacer UPDATE con tipos correctos
 */
export async function updateTable<T extends TableName>(
  table: T,
  data: any
) {
  const supabase = createClient()
  return (supabase.from(table as any).update(data) as any)
}

/**
 * Helper para hacer DELETE con tipos correctos
 */
export async function deleteFrom<T extends TableName>(
  table: T
) {
  const supabase = createClient()
  return (supabase.from(table as any).delete() as any)
}

/**
 * Wrapper del cliente de Supabase que maneja tipos correctamente
 */
export function getTypedClient() {
  const supabase = createClient()
  
  return {
    from: (table: TableName) => {
      return {
        select: (query: string = '*') => (supabase.from(table as any).select(query) as any),
        insert: (data: any) => (supabase.from(table as any).insert(data) as any),
        update: (data: any) => (supabase.from(table as any).update(data) as any),
        delete: () => (supabase.from(table as any).delete() as any),
        upsert: (data: any) => (supabase.from(table as any).upsert(data) as any),
      }
    },
    auth: supabase.auth,
    storage: supabase.storage,
  }
}
