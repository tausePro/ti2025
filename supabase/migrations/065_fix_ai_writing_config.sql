-- =====================================================
-- MIGRACIÓN 065: CORREGIR ai_writing_config
-- =====================================================
-- Eliminar dependencia de company_id y usar is_global

-- 1. Agregar columna is_global
ALTER TABLE ai_writing_config 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 2. Migrar datos: marcar como global las que tienen company_id NULL
UPDATE ai_writing_config 
SET is_global = true 
WHERE company_id IS NULL;

-- 3. Eliminar constraint UNIQUE viejo
ALTER TABLE ai_writing_config 
DROP CONSTRAINT IF EXISTS ai_writing_config_company_id_config_name_key;

-- 4. Agregar nuevo constraint UNIQUE
ALTER TABLE ai_writing_config 
ADD CONSTRAINT ai_writing_config_config_name_key UNIQUE (config_name);

-- 5. Hacer company_id nullable y eliminarlo eventualmente
ALTER TABLE ai_writing_config 
ALTER COLUMN company_id DROP NOT NULL;

-- 6. Eliminar índice viejo
DROP INDEX IF EXISTS idx_ai_writing_config_company;

-- 7. Crear nuevo índice
CREATE INDEX IF NOT EXISTS idx_ai_writing_config_global 
ON ai_writing_config(is_global) WHERE is_global = true;

-- 8. Actualizar política RLS
DROP POLICY IF EXISTS "Usuarios pueden ver configuraciones de IA" ON ai_writing_config;

CREATE POLICY "Usuarios pueden ver configuraciones de IA"
  ON ai_writing_config
  FOR SELECT
  TO authenticated
  USING (
    is_global = true -- Configuraciones globales
    OR
    created_by = auth.uid() -- O configuraciones propias
  );

-- 9. Verificar
SELECT 
  config_name, 
  is_global, 
  company_id,
  is_active 
FROM ai_writing_config;
