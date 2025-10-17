-- =====================================================
-- MIGRACIÓN 044: ELIMINAR CONSTRAINT ÚNICO DE DAILY_LOGS
-- =====================================================
-- El constraint "daily_logs_project_id_date_created_by_key" 
-- impide crear múltiples bitácoras por día por usuario,
-- lo cual es muy restrictivo.

-- 1. Eliminar el constraint único si existe
ALTER TABLE daily_logs
DROP CONSTRAINT IF EXISTS daily_logs_project_id_date_created_by_key;

-- 2. Verificar que se eliminó
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_logs_project_id_date_created_by_key'
  ) THEN
    RAISE NOTICE '✅ Constraint único eliminado correctamente';
  ELSE
    RAISE WARNING '⚠️ El constraint aún existe';
  END IF;
END $$;

-- 3. Crear índice no único para mejorar performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date_user 
ON daily_logs(project_id, date, created_by);

COMMENT ON INDEX idx_daily_logs_project_date_user IS 
'Índice para búsquedas rápidas de bitácoras por proyecto, fecha y usuario';
