import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = 'https://egizwroxfxghgqmtucgk.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaXp3cm94ZnhnaGdxbXR1Y2drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM3MDE1NCwiZXhwIjoyMDcyOTQ2MTU0fQ.P5Bdarp5YqlLVS106Xpk5xexkRzJwtEwjaKrnhWSO1I'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sql) {
  // Usar fetch directo a la API de Supabase
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ query: sql })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(error)
  }
  
  return response.json()
}

async function runMigration(filename) {
  console.log(`\n📄 Ejecutando migración: ${filename}`)
  
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', filename)
  const sql = readFileSync(migrationPath, 'utf-8')
  
  try {
    // Ejecutar usando query directo
    const { error } = await supabase.rpc('exec', { query: sql })
    
    if (error) {
      console.error(`❌ Error en ${filename}:`, error.message)
      console.log('⚠️  Intentando ejecutar manualmente...')
      console.log('\n--- SQL ---')
      console.log(sql)
      console.log('--- FIN SQL ---\n')
      return false
    }
    
    console.log(`✅ ${filename} ejecutada exitosamente`)
    return true
  } catch (err) {
    console.error(`❌ Error ejecutando ${filename}:`, err.message)
    console.log('\n⚠️  Copia y pega este SQL en Supabase SQL Editor:\n')
    console.log('--- SQL ---')
    console.log(sql)
    console.log('--- FIN SQL ---\n')
    return false
  }
}

async function main() {
  console.log('🚀 Iniciando ejecución de migraciones...\n')
  
  const migrations = [
    '044_remove_daily_logs_unique_constraint.sql',
    '045_add_op_id_columns_to_payment_orders.sql',
    '046_simplify_payment_orders.sql'
  ]
  
  for (const migration of migrations) {
    await runMigration(migration)
  }
  
  console.log('\n✅ Proceso completado')
}

main().catch(console.error)
