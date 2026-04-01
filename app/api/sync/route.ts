import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Campos internos que no existen en la tabla de Supabase
const INTERNAL_FIELDS = ['sync_status', 'sync_error', 'offline_created', '_isLocal']

function cleanForSupabase(data: any): any {
  const clean = { ...data }
  for (const field of INTERNAL_FIELDS) {
    delete clean[field]
  }
  return clean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { operations } = await request.json()

    const results = []

    for (const operation of operations) {
      try {
        let result
        
        switch (operation.table_name) {
          case 'daily_logs': {
            const cleanData = cleanForSupabase(operation.data)
            const isOfflineId = cleanData.id?.startsWith('offline_')

            if (operation.operation === 'create') {
              // Eliminar ID offline para que Supabase genere un UUID real
              if (isOfflineId) {
                delete cleanData.id
              }

              const { data, error } = await supabase
                .from('daily_logs')
                .insert({ ...cleanData, sync_status: 'synced' })
                .select()
                .single()
              
              if (error) throw error
              result = {
                success: true,
                data,
                local_id: operation.record_id,
                remote_id: data.id
              }
            } else if (operation.operation === 'update') {
              if (isOfflineId) {
                result = { success: false, error: 'No se puede actualizar un registro con ID offline' }
                break
              }

              const { id, created_by, created_at, ...updatePayload } = cleanData

              const { data, error } = await supabase
                .from('daily_logs')
                .update({ ...updatePayload, sync_status: 'synced' })
                .eq('id', operation.record_id)
                .select()
                .single()
              
              if (error) throw error
              result = { success: true, data }
            }
            break
          }

          case 'photos': {
            if (operation.operation === 'create') {
              result = { success: true, note: 'Las fotos se sincronizan directamente desde el sync-manager' }
            }
            break
          }

          default:
            result = { success: false, error: 'Tabla no soportada' }
        }

        results.push({
          operation_id: operation.id,
          ...result
        })

      } catch (error) {
        results.push({
          operation_id: operation.id,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Error en sincronización:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
