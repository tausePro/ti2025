-- =====================================================
-- MIGRACIÓN 081: Permitir a supervisores ver plantillas globales
-- =====================================================
-- Los supervisores necesitan ver las plantillas globales para asignarlas a proyectos

-- 1. Eliminar política actual de SELECT
DROP POLICY IF EXISTS "Usuarios con permiso pueden ver plantillas" ON report_templates;

-- 2. Crear nueva política que incluya supervisores
CREATE POLICY "Usuarios con permiso pueden ver plantillas"
  ON report_templates
  FOR SELECT
  TO authenticated
  USING (
    -- Admin, super_admin y supervisor siempre pueden ver
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'supervisor')
    )
    OR
    -- Otros roles verifican en role_permissions
    EXISTS (
      SELECT 1 
      FROM role_permissions rp
      JOIN profiles p ON p.id = auth.uid()
      WHERE rp.role = p.role
      AND rp.module = 'plantillas_pdf'
      AND rp.action = 'read'
      AND rp.allowed = true
    )
  );

-- 3. También asegurar que supervisores puedan ejecutar clone_template_to_project
-- La función ya tiene SECURITY DEFINER, así que debería funcionar

-- 4. Verificar políticas
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'report_templates';
