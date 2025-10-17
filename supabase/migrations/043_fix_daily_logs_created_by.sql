-- =====================================================
-- MIGRACIÓN 043: CORREGIR FOREIGN KEY daily_logs_created_by_fkey
-- =====================================================
-- El error indica que la columna created_by en daily_logs
-- no está correctamente vinculada a profiles.id

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

-- 6. Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'daily_logs'
ORDER BY ordinal_position;
