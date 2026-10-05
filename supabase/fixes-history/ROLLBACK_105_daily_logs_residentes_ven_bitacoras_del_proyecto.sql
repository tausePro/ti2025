-- Rollback de la migración 105.
-- Vuelve al comportamiento anterior: cada residente solo ve sus propias bitácoras.
-- No toca ninguna otra política de daily_logs.

DROP POLICY IF EXISTS "residente_view_project_logs" ON daily_logs;
