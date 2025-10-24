-- =====================================================
-- MIGRACIÓN 050: CORREGIR RLS DE DAILY_LOG_CONFIGS
-- =====================================================
-- Simplificar políticas para que supervisores puedan guardar

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "view_daily_log_configs" ON daily_log_configs;
DROP POLICY IF EXISTS "manage_daily_log_configs" ON daily_log_configs;

-- Política simplificada: Miembros del proyecto pueden ver
CREATE POLICY "view_daily_log_configs" ON daily_log_configs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = daily_log_configs.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Política INSERT: Miembros del proyecto pueden crear
CREATE POLICY "insert_daily_log_configs" ON daily_log_configs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = daily_log_configs.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Política UPDATE: Miembros del proyecto pueden actualizar
CREATE POLICY "update_daily_log_configs" ON daily_log_configs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = daily_log_configs.project_id
        AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = daily_log_configs.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Política DELETE: Miembros del proyecto pueden eliminar
CREATE POLICY "delete_daily_log_configs" ON daily_log_configs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = daily_log_configs.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Verificar políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'daily_log_configs';
