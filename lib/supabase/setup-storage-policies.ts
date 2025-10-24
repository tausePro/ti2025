/**
 * Script para configurar políticas de Storage
 * 
 * Las políticas de storage.objects requieren service_role key
 * Este script debe ejecutarse una vez después de crear el bucket
 * 
 * Uso:
 * - Desde terminal: npx tsx lib/supabase/setup-storage-policies.ts
 * - O llamar setupReportsStoragePolicies() desde un API route
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Configurar políticas para el bucket 'reports'
 */
export async function setupReportsStoragePolicies() {
  console.log('🔧 Configurando políticas de Storage para bucket "reports"...')

  try {
    // 1. Eliminar políticas existentes
    console.log('📝 Eliminando políticas antiguas...')
    
    const policiesToDrop = [
      'Project members can upload reports',
      'System can upload generated reports',
      'Project members can view reports',
      'Admins can delete reports'
    ]

    for (const policyName of policiesToDrop) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${policyName}" ON storage.objects;`
      })
      if (error) console.log(`  ⚠️  ${policyName}: ${error.message}`)
    }

    // 2. Crear política INSERT
    // NOTA: Los reportes se generan automáticamente desde la plataforma
    // Solo el sistema (service_role) puede subir reportes
    // Esta política es para permitir que el backend genere los PDFs
    console.log('📝 Creando política INSERT...')
    const insertPolicy = `
      CREATE POLICY "System can upload generated reports"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'reports' AND
        -- Solo admins pueden subir (cuando el sistema genera el PDF)
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('super_admin', 'admin')
        )
      );
    `
    
    const { error: insertError } = await supabase.rpc('exec_sql', { sql: insertPolicy })
    if (insertError) {
      console.error('❌ Error creando política INSERT:', insertError)
    } else {
      console.log('✅ Política INSERT creada')
    }

    // 3. Crear política SELECT
    console.log('📝 Creando política SELECT...')
    const selectPolicy = `
      CREATE POLICY "Project members can view reports"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'reports' AND (
          EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.user_id = auth.uid() 
            AND pm.is_active = true
          )
          OR
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
          )
        )
      );
    `
    
    const { error: selectError } = await supabase.rpc('exec_sql', { sql: selectPolicy })
    if (selectError) {
      console.error('❌ Error creando política SELECT:', selectError)
    } else {
      console.log('✅ Política SELECT creada')
    }

    // 4. Crear política DELETE
    console.log('📝 Creando política DELETE...')
    const deletePolicy = `
      CREATE POLICY "Admins can delete reports"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'reports' AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('super_admin', 'admin')
        )
      );
    `
    
    const { error: deleteError } = await supabase.rpc('exec_sql', { sql: deletePolicy })
    if (deleteError) {
      console.error('❌ Error creando política DELETE:', deleteError)
    } else {
      console.log('✅ Política DELETE creada')
    }

    console.log('🎉 Políticas de Storage configuradas exitosamente')
    return { success: true }

  } catch (error) {
    console.error('❌ Error configurando políticas:', error)
    return { success: false, error }
  }
}

// Si se ejecuta directamente desde terminal
if (require.main === module) {
  setupReportsStoragePolicies()
    .then(() => {
      console.log('✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}
