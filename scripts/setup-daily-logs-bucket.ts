import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no encontradas')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDailyLogsPhotoBucket() {
  console.log('🚀 Configurando bucket de fotos de bitácoras...')
  
  try {
    // 1. Verificar si el bucket existe
    console.log('📦 Verificando bucket existente...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listando buckets:', listError)
      throw listError
    }

    const bucketExists = buckets?.some(b => b.id === 'daily-logs-photos')
    
    if (bucketExists) {
      console.log('✅ Bucket "daily-logs-photos" ya existe')
      
      // Actualizar configuración
      console.log('🔄 Actualizando configuración del bucket...')
      const { data: updateData, error: updateError } = await supabase.storage.updateBucket('daily-logs-photos', {
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
      
      if (updateError) {
        console.error('⚠️ Error actualizando bucket:', updateError)
      } else {
        console.log('✅ Bucket actualizado correctamente')
      }
    } else {
      // Crear bucket
      console.log('📦 Creando bucket "daily-logs-photos"...')
      const { data: createData, error: createError } = await supabase.storage.createBucket('daily-logs-photos', {
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
      
      if (createError) {
        console.error('❌ Error creando bucket:', createError)
        throw createError
      }
      
      console.log('✅ Bucket creado exitosamente:', createData)
    }

    // 2. Verificar políticas RLS
    console.log('\n📋 Verificando políticas RLS...')
    console.log('⚠️ Las políticas RLS deben configurarse manualmente en el Dashboard de Supabase')
    console.log('👉 Ve a: Storage > daily-logs-photos > Policies')
    console.log('\nPolíticas necesarias:')
    console.log('1. INSERT - Authenticated users can upload')
    console.log('2. SELECT - Anyone can view (public)')
    console.log('3. UPDATE - Users can update their own photos')
    console.log('4. DELETE - Users can delete their own photos or admins can delete any')

    // 3. Probar upload
    console.log('\n🧪 Probando upload de archivo de prueba...')
    const testFile = new Blob(['test content'], { type: 'text/plain' })
    const testPath = `test/${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('daily-logs-photos')
      .upload(testPath, testFile)
    
    if (uploadError) {
      console.error('❌ Error en upload de prueba:', uploadError)
      console.log('⚠️ Verifica que las políticas RLS estén configuradas correctamente')
    } else {
      console.log('✅ Upload de prueba exitoso:', uploadData.path)
      
      // Limpiar archivo de prueba
      await supabase.storage.from('daily-logs-photos').remove([testPath])
      console.log('🧹 Archivo de prueba eliminado')
    }

    console.log('\n✅ Configuración completada!')
    console.log('\n📝 Próximos pasos:')
    console.log('1. Configura las políticas RLS en el Dashboard')
    console.log('2. Prueba subir una foto desde la aplicación')
    console.log('3. Verifica que las fotos se muestren correctamente')

  } catch (error) {
    console.error('❌ Error en la configuración:', error)
    process.exit(1)
  }
}

// Ejecutar
setupDailyLogsPhotoBucket()
  .then(() => {
    console.log('\n🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })
