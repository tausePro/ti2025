-- =====================================================
-- MIGRACIÓN 057: RLS USANDO ROLE_PERMISSIONS
-- =====================================================
-- Cambiar políticas para usar la tabla role_permissions
-- en lugar de verificar roles directamente

-- 1. Eliminar políticas actuales
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver plantillas" ON report_templates;
DROP POLICY IF EXISTS "Admin y super_admin pueden crear plantillas" ON report_templates;
DROP POLICY IF EXISTS "Admin y super_admin pueden actualizar plantillas" ON report_templates;
DROP POLICY IF EXISTS "Super admin puede eliminar plantillas" ON report_templates;

-- 2. Política SELECT: Verificar permiso 'read' en role_permissions
CREATE POLICY "Usuarios con permiso pueden ver plantillas"
  ON report_templates
  FOR SELECT
  TO authenticated
  USING (
    -- Admin y super_admin siempre pueden ver
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Otros roles verifican en role_permissions
    EXISTS (
      SELECT 1 
      FROM role_permissions rp
      WHERE rp.role::text = (SELECT role FROM profiles WHERE id = auth.uid())
      AND rp.module = 'plantillas_pdf'
      AND rp.action = 'read'
      AND rp.allowed = true
    )
  );

-- 3. Política INSERT: Verificar permiso 'create' en role_permissions
CREATE POLICY "Usuarios con permiso pueden crear plantillas"
  ON report_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin y super_admin siempre pueden crear
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Otros roles verifican en role_permissions
    EXISTS (
      SELECT 1 
      FROM role_permissions rp
      WHERE rp.role::text = (SELECT role FROM profiles WHERE id = auth.uid())
      AND rp.module = 'plantillas_pdf'
      AND rp.action = 'create'
      AND rp.allowed = true
    )
  );

-- 4. Política UPDATE: Verificar permiso 'update' en role_permissions
CREATE POLICY "Usuarios con permiso pueden actualizar plantillas"
  ON report_templates
  FOR UPDATE
  TO authenticated
  USING (
    -- Admin y super_admin siempre pueden actualizar
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Otros roles verifican en role_permissions
    EXISTS (
      SELECT 1 
      FROM role_permissions rp
      WHERE rp.role::text = (SELECT role FROM profiles WHERE id = auth.uid())
      AND rp.module = 'plantillas_pdf'
      AND rp.action = 'update'
      AND rp.allowed = true
    )
  )
  WITH CHECK (
    -- Misma verificación para WITH CHECK
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 
      FROM profiles p
      INNER JOIN role_permissions rp ON rp.role = p.role::text
      WHERE p.id = auth.uid()
      AND rp.module = 'plantillas_pdf'
      AND rp.action = 'update'
      AND rp.allowed = true
    )
  );

-- 5. Política DELETE: Verificar permiso 'delete' en role_permissions
CREATE POLICY "Usuarios con permiso pueden eliminar plantillas"
  ON report_templates
  FOR DELETE
  TO authenticated
  USING (
    -- Admin y super_admin siempre pueden eliminar
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Otros roles verifican en role_permissions
    EXISTS (
      SELECT 1 
      FROM role_permissions rp
      WHERE rp.role::text = (SELECT role FROM profiles WHERE id = auth.uid())
      AND rp.module = 'plantillas_pdf'
      AND rp.action = 'delete'
      AND rp.allowed = true
    )
  );

-- 6. Verificar políticas creadas
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'report_templates'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END;

-- Comentarios
COMMENT ON TABLE report_templates IS 'Plantillas de informes PDF - RLS usando role_permissions para gestión desde admin';
