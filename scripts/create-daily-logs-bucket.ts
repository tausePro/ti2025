/**
 * Script para crear bucket daily-logs-photos con service_role key
 * Ejecutar con: npx tsx scripts/create-daily-logs-bucket.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Cargar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Faltan variables de entorno:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Crear cliente con service_role key (permisos totales)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createBucketAndPolicies() {
  console.log('🚀 Iniciando creación de bucket daily-logs-photos...\n')

  try {
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../supabase/migrations/036_create_daily_logs_photos_bucket.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 Ejecutando migración 036...')
    
    // Ejecutar la migración completa
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      // Si exec_sql no existe, intentar ejecutar directamente
      console.log('⚠️  exec_sql no disponible, ejecutando por partes...\n')
      
      // 1. Crear bucket
      console.log('1️⃣ Creando bucket...')
      const { error: bucketError } = await supabase.storage.createBucket('daily-logs-photos', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/heic',
          'image/heif'
        ]
      })

      if (bucketError && !bucketError.message.includes('already exists')) {
        throw bucketError
      }
      console.log('   ✅ Bucket creado o ya existe\n')

      // 2. Las políticas deben crearse manualmente desde el Dashboard
      console.log('2️⃣ Políticas RLS:')
      console.log('   ⚠️  Las políticas deben crearse desde Supabase Dashboard')
      console.log('   📍 Ve a: Storage > daily-logs-photos > Policies')
      console.log('   📚 Guía: docs/SETUP_DAILY_LOGS_PHOTOS_BUCKET.md\n')

    } else {
      console.log('✅ Migración ejecutada exitosamente\n')
    }

    // Verificar que el bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) throw listError

    const bucketExists = buckets?.some(b => b.id === 'daily-logs-photos')
    
    if (bucketExists) {
      console.log('✅ Bucket daily-logs-photos confirmado')
      console.log('📦 Configuración:')
      console.log('   - Público: ✅')
      console.log('   - Límite: 10MB')
      console.log('   - Tipos: Imágenes (JPG, PNG, WEBP, HEIC)')
    } else {
      console.log('❌ Bucket no encontrado')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Ejecutar
createBucketAndPolicies()
  .then(() => {
    console.log('\n🎉 Proceso completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error)
    process.exit(1)
  })
