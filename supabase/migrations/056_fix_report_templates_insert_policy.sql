-- =====================================================
-- MIGRACIÓN 056: ARREGLAR POLÍTICA DE INSERT
-- =====================================================
-- El problema es que la política verifica profiles.role pero
-- puede haber un problema con la consulta

-- Primero, eliminar la política actual de INSERT
DROP POLICY IF EXISTS "Admin y super_admin pueden crear plantillas" ON report_templates;

-- Crear nueva política de INSERT más simple y directa
CREATE POLICY "Admin y super_admin pueden crear plantillas"
  ON report_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role IN ('admin', 'super_admin')
    )
  );

-- Verificar que la política se creó correctamente
SELECT 
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE tablename = 'report_templates'
  AND cmd = 'INSERT';

-- Probar que un admin puede insertar (reemplaza el UUID con tu user ID)
-- SELECT 
--   auth.uid() as current_user,
--   p.role,
--   CASE 
--     WHEN p.role IN ('admin', 'super_admin') THEN 'PUEDE INSERTAR'
--     ELSE 'NO PUEDE INSERTAR'
--   END as permiso
-- FROM profiles p
-- WHERE p.id = auth.uid();
