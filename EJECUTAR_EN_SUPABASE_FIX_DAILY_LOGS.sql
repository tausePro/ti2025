-- =====================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- Corregir foreign key de daily_logs
-- =====================================================

-- 1. Ver estructura actual
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_logs'
ORDER BY ordinal_position;

-- 2. Ver constraints actuales
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'daily_logs';

-- 3. Agregar columna created_by si no existe
ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS created_by UUID;

-- 4. Agregar columna photos si no existe
ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS photos TEXT[];

-- 5. Eliminar constraint existente si hay
ALTER TABLE daily_logs
DROP CONSTRAINT IF EXISTS daily_logs_created_by_fkey;

-- 6. Crear constraint correcto
ALTER TABLE daily_logs
ADD CONSTRAINT daily_logs_created_by_fkey
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- 7. Crear índice
CREATE INDEX IF NOT EXISTS idx_daily_logs_created_by 
ON daily_logs(created_by);

-- 8. Comentarios
COMMENT ON COLUMN daily_logs.created_by IS 'Usuario que creó la bitácora';
COMMENT ON COLUMN daily_logs.photos IS 'URLs de fotos subidas a Supabase Storage';

-- 9. Verificar resultado
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_logs'
ORDER BY ordinal_position;

-- 10. Verificar constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'daily_logs';
