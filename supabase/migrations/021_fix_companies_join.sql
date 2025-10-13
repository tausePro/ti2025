-- =====================================================
-- MIGRACIÓN 021: PERMITIR JOIN DE COMPANIES EN PROJECTS
-- =====================================================
-- PROBLEMA: Las políticas de companies bloquean el JOIN cuando se consultan proyectos
-- SOLUCIÓN: Agregar política que permita ver companies cuando se hace JOIN desde projects

-- Eliminar política restrictiva
DROP POLICY IF EXISTS "management_view_companies" ON companies;

-- Crear política más permisiva que permite JOINs
CREATE POLICY "allow_view_companies_for_projects" ON companies
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (
      -- Admin, gerente, supervisor pueden ver todas
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'gerente', 'supervisor')
      )
      OR
      -- Cliente puede ver su empresa
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'cliente'
      )
      AND EXISTS (
        SELECT 1 FROM user_company_permissions
        WHERE user_company_permissions.user_id = auth.uid()
        AND user_company_permissions.company_id = companies.id
        AND user_company_permissions.is_active = true
      )
      OR
      -- Permitir JOIN cuando se consulta desde projects (para que el JOIN funcione)
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.client_company_id = companies.id
      )
    )
  );

COMMENT ON POLICY "allow_view_companies_for_projects" ON companies IS 
'Permite ver companies: admin/gerente/supervisor ven todas, cliente ve su empresa, y permite JOINs desde projects';
