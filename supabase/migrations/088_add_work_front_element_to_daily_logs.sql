-- =====================================================
-- MIGRACIÓN 088: AGREGAR FRENTE DE TRABAJO Y ELEMENTO A DAILY_LOGS
-- =====================================================
-- Campos para clasificar actividades por frente de trabajo y elemento estructural

ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS work_front TEXT,
ADD COLUMN IF NOT EXISTS element TEXT;

COMMENT ON COLUMN daily_logs.work_front IS 'Frente de trabajo (ej: Torre A, Zona Norte)';
COMMENT ON COLUMN daily_logs.element IS 'Elemento estructural (ej: Columna C-3, Losa Piso 5)';

-- Índice para filtrar bitácoras por frente de trabajo
CREATE INDEX IF NOT EXISTS idx_daily_logs_work_front ON daily_logs(work_front) WHERE work_front IS NOT NULL;

NOTIFY pgrst, 'reload schema';
