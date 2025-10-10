-- =====================================================
-- RLS POLICIES para daily_logs - Correctas por Rol
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "authenticated_all_daily_logs" ON daily_logs;
DROP POLICY IF EXISTS "super_admin_admin_view_all_logs" ON daily_logs;
DROP POLICY IF EXISTS "gerente_view_all_logs" ON daily_logs;
DROP POLICY IF EXISTS "supervisor_manage_project_logs" ON daily_logs;
DROP POLICY IF EXISTS "residente_manage_own_logs" ON daily_logs;

-- 1. SUPER_ADMIN y ADMIN: Acceso total a todas las bitácoras
CREATE POLICY "super_admin_admin_all_logs" ON daily_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 2. GERENTE: Ver todas las bitácoras, crear/editar las propias
CREATE POLICY "gerente_logs" ON daily_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gerente'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gerente'
      AND (daily_logs.created_by = auth.uid() OR daily_logs.created_by IS NULL)
    )
  );

-- 3. SUPERVISOR: Ver y gestionar bitácoras de proyectos donde es miembro
CREATE POLICY "supervisor_project_logs" ON daily_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supervisor'
    )
    AND (
      -- Es miembro del proyecto
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = daily_logs.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.is_active = true
      )
      OR
      -- O es el creador
      daily_logs.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supervisor'
    )
    AND (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = daily_logs.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.is_active = true
      )
      OR daily_logs.created_by = auth.uid()
    )
  );

-- 4. RESIDENTE: Solo crear y editar sus propias bitácoras (no ve otras)
CREATE POLICY "residente_own_logs" ON daily_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'residente'
    )
    AND daily_logs.created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'residente'
    )
    AND daily_logs.created_by = auth.uid()
  );

-- 5. CLIENTE: NO tiene acceso a bitácoras (solo ve informes finales)
-- No se crea política para cliente en daily_logs

-- Verificar políticas creadas
SELECT 
  policyname,
  cmd as command,
  roles
FROM pg_policies 
WHERE tablename = 'daily_logs'
ORDER BY policyname;
