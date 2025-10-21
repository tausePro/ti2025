import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(filename: string) {
  console.log(`\n📄 Ejecutando migración: ${filename}`)
  
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error(`❌ Error en ${filename}:`, error)
      return false
    }
    
    console.log(`✅ ${filename} ejecutada exitosamente`)
    return true
  } catch (err) {
    console.error(`❌ Error ejecutando ${filename}:`, err)
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
    const success = await runMigration(migration)
    if (!success) {
      console.error('\n❌ Proceso detenido por error')
      process.exit(1)
    }
  }
  
  console.log('\n✅ Todas las migraciones ejecutadas exitosamente')
}

main()
