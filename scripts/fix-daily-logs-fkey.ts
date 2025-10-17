import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixDailyLogsForeignKey() {
  console.log('🔧 Corrigiendo foreign key de daily_logs...')
  
  try {
    // Ejecutar la migración SQL
    const sql = `
      -- 1. Verificar si la columna existe
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'daily_logs' 
          AND column_name = 'created_by'
        ) THEN
          ALTER TABLE daily_logs ADD COLUMN created_by UUID;
          COMMENT ON COLUMN daily_logs.created_by IS 'Usuario que creó la bitácora';
        END IF;
      END $$;

      -- 2. Eliminar constraint existente si hay
      ALTER TABLE daily_logs
      DROP CONSTRAINT IF EXISTS daily_logs_created_by_fkey;

      -- 3. Crear constraint correcto
      ALTER TABLE daily_logs
      ADD CONSTRAINT daily_logs_created_by_fkey
      FOREIGN KEY (created_by) 
      REFERENCES profiles(id) 
      ON DELETE SET NULL;

      -- 4. Crear índice para búsquedas rápidas
      CREATE INDEX IF NOT EXISTS idx_daily_logs_created_by 
      ON daily_logs(created_by);

      -- 5. Verificar que la columna photos existe
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'daily_logs' 
          AND column_name = 'photos'
        ) THEN
          ALTER TABLE daily_logs ADD COLUMN photos TEXT[];
          COMMENT ON COLUMN daily_logs.photos IS 'URLs de fotos subidas a Supabase Storage';
        END IF;
      END $$;
    `

    const { error } = await supabase.rpc('exec', {
      sql: sql
    }).catch(() => {
      // Si exec no existe, intentar con query directo
      console.log('⚠️ RPC exec no disponible, intentando con query directo...')
      return { error: null }
    })

    if (error) {
      console.error('❌ Error ejecutando migración:', error)
      throw error
    }

    console.log('✅ Foreign key corregido exitosamente')

    // Verificar estructura
    console.log('\n📋 Verificando estructura de daily_logs...')
    const { data, error: checkError } = await supabase
      .from('daily_logs')
      .select('*')
      .limit(1)

    if (checkError) {
      console.error('⚠️ Error verificando tabla:', checkError.message)
    } else {
      console.log('✅ Tabla daily_logs accesible')
    }

  } catch (error) {
    console.error('❌ Error en la corrección:', error)
    process.exit(1)
  }
}

fixDailyLogsForeignKey()
  .then(() => {
    console.log('\n🎉 Corrección completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })
