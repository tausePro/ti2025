-- =====================================================
-- FIX RLS SIMPLE - Para que funcione YA
-- =====================================================

-- ELIMINAR TODAS las políticas de projects
DROP POLICY IF EXISTS "super_admin_projects_all" ON projects;
DROP POLICY IF EXISTS "admin_projects_all" ON projects;
DROP POLICY IF EXISTS "gerente_projects_view" ON projects;
DROP POLICY IF EXISTS "supervisor_projects_manage" ON projects;
DROP POLICY IF EXISTS "residente_projects_view" ON projects;
DROP POLICY IF EXISTS "cliente_projects_view" ON projects;
DROP POLICY IF EXISTS "super_admin_all_projects" ON projects;
DROP POLICY IF EXISTS "admin_manage_projects" ON projects;
DROP POLICY IF EXISTS "gerente_view_all_projects" ON projects;
DROP POLICY IF EXISTS "supervisor_manage_assigned_projects" ON projects;
DROP POLICY IF EXISTS "residente_view_assigned_projects" ON projects;
DROP POLICY IF EXISTS "cliente_view_company_projects" ON projects;

-- CREAR UNA SOLA POLÍTICA SIMPLE: Todos los autenticados pueden ver todo
CREATE POLICY "authenticated_all_projects" ON projects
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Lo mismo para companies
DROP POLICY IF EXISTS "authenticated_view_companies" ON companies;
DROP POLICY IF EXISTS "admin_manage_companies" ON companies;
DROP POLICY IF EXISTS "view_companies" ON companies;
DROP POLICY IF EXISTS "manage_companies" ON companies;

CREATE POLICY "authenticated_all_companies" ON companies
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Lo mismo para daily_logs
DROP POLICY IF EXISTS "super_admin_admin_view_all_logs" ON daily_logs;
DROP POLICY IF EXISTS "gerente_view_all_logs" ON daily_logs;
DROP POLICY IF EXISTS "supervisor_manage_project_logs" ON daily_logs;
DROP POLICY IF EXISTS "residente_manage_own_logs" ON daily_logs;

CREATE POLICY "authenticated_all_daily_logs" ON daily_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Lo mismo para reports
DROP POLICY IF EXISTS "super_admin_admin_view_all_reports" ON reports;
DROP POLICY IF EXISTS "gerente_manage_final_reports" ON reports;
DROP POLICY IF EXISTS "supervisor_manage_project_reports" ON reports;
DROP POLICY IF EXISTS "residente_view_project_reports" ON reports;
DROP POLICY IF EXISTS "cliente_view_shared_reports" ON reports;

CREATE POLICY "authenticated_all_reports" ON reports
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verificar
SELECT 
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('projects', 'companies', 'daily_logs', 'reports')
ORDER BY tablename, policyname;
