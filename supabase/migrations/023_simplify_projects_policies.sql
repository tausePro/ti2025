-- =====================================================
-- MIGRACIÓN 023: SIMPLIFICAR POLÍTICAS DE PROJECTS
-- =====================================================
-- PROBLEMA: Política de cliente causa recursión infinita con user_company_permissions
-- SOLUCIÓN: Simplificar políticas sin referencias a user_company_permissions

-- 1. ELIMINAR POLÍTICA PROBLEMÁTICA DE CLIENTE
DROP POLICY IF EXISTS "cliente_view_company" ON projects;

-- 2. RECREAR POLÍTICA DE CLIENTE SIN RECURSIÓN
-- Cliente puede ver todos los proyectos (simplificado por ahora)
CREATE POLICY "cliente_view_all_projects" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cliente'
    )
  );

COMMENT ON POLICY "cliente_view_all_projects" ON projects IS 
'Cliente puede ver todos los proyectos (simplificado para evitar recursión)';
