-- =====================================================
-- ROLLBACK DE LA MIGRACIÓN 090
-- =====================================================
-- Pega este script en el SQL Editor de Supabase para revertir
-- supabase/migrations/090_project_checklist_template_rpc.sql.
--
-- Solo elimina la función creada. No toca ninguna fila de
-- daily_log_configs ni de otras tablas.
--
-- Nota: tras correr este rollback, el botón "Guardar como plantilla
-- del proyecto" en el frontend mostrará un error al pulsarlo porque
-- la RPC ya no existirá. Si vas a dejar el rollback aplicado por un
-- tiempo, considera también revertir el botón en
-- components/daily-logs/DailyLogFormTabs.tsx.
-- =====================================================

BEGIN;

DROP FUNCTION IF EXISTS public.update_project_checklist_template(uuid, jsonb);

COMMIT;
