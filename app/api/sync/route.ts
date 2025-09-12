import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db/schema'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
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
          case 'daily_logs':
            if (operation.operation === 'create') {
              const { data, error } = await supabase
                .from('daily_logs')
                .insert(operation.data)
                .select()
                .single()
              
              if (error) throw error
              result = { success: true, data }
            } else if (operation.operation === 'update') {
              const { data, error } = await supabase
                .from('daily_logs')
                .update(operation.data)
                .eq('id', operation.record_id)
                .select()
                .single()
              
              if (error) throw error
              result = { success: true, data }
            }
            break

          case 'photos':
            if (operation.operation === 'create') {
              // Para fotos, primero subir a Storage, luego crear registro
              const { data, error } = await supabase
                .from('photos')
                .insert(operation.data)
                .select()
                .single()
              
              if (error) throw error
              result = { success: true, data }
            }
            break

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
