-- =====================================================
-- MIGRACIÓN 054: POLÍTICAS RLS PARA REPORT_TEMPLATES
-- =====================================================
-- Agregar políticas de seguridad para la tabla report_templates

-- Habilitar RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- 1. Política de SELECT: Todos los usuarios autenticados pueden ver plantillas
CREATE POLICY "Usuarios autenticados pueden ver plantillas"
  ON report_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Política de INSERT: Solo admin y super_admin pueden crear plantillas
CREATE POLICY "Admin y super_admin pueden crear plantillas"
  ON report_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 3. Política de UPDATE: Solo admin y super_admin pueden actualizar plantillas
CREATE POLICY "Admin y super_admin pueden actualizar plantillas"
  ON report_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 4. Política de DELETE: Solo super_admin puede eliminar plantillas
CREATE POLICY "Super admin puede eliminar plantillas"
  ON report_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Verificar políticas creadas
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
WHERE tablename = 'report_templates'
ORDER BY policyname;

-- Comentarios
COMMENT ON TABLE report_templates IS 'Plantillas configurables para informes PDF - RLS habilitado';
