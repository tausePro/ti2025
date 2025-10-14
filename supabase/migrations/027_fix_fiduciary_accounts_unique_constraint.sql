-- =====================================================
-- MIGRACIÓN 027: FIX UNIQUE CONSTRAINT EN FIDUCIARY_ACCOUNTS
-- =====================================================
-- PROBLEMA: La constraint única en sifi_code no permite múltiples proyectos
-- SOLUCIÓN: Cambiar a constraint única compuesta (project_id, sifi_code)

-- 1. Eliminar constraint única actual de sifi_code
ALTER TABLE fiduciary_accounts
DROP CONSTRAINT IF EXISTS fiduciary_accounts_sifi_code_key;

-- 2. Crear constraint única compuesta (project_id + sifi_code)
-- Esto permite que diferentes proyectos tengan SIFI 1 y 2, pero no duplicados dentro del mismo proyecto
ALTER TABLE fiduciary_accounts
ADD CONSTRAINT fiduciary_accounts_project_sifi_unique 
UNIQUE (project_id, sifi_code);

COMMENT ON CONSTRAINT fiduciary_accounts_project_sifi_unique ON fiduciary_accounts IS 
'Cada proyecto puede tener solo una cuenta SIFI 1 y una SIFI 2';
