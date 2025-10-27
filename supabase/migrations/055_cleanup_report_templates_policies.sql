-- =====================================================
-- MIGRACIÓN 055: LIMPIAR POLÍTICAS DUPLICADAS
-- =====================================================
-- Eliminar políticas antiguas y dejar solo las correctas

-- Eliminar políticas antiguas/duplicadas
DROP POLICY IF EXISTS "Admins can manage templates" ON report_templates;
DROP POLICY IF EXISTS "Users can view templates from their company or global" ON report_templates;

-- Verificar políticas finales (deben quedar solo 4)
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

-- Resultado esperado:
-- 1. "Usuarios autenticados pueden ver plantillas" (SELECT)
-- 2. "Admin y super_admin pueden crear plantillas" (INSERT)
-- 3. "Admin y super_admin pueden actualizar plantillas" (UPDATE)
-- 4. "Super admin puede eliminar plantillas" (DELETE)
