-- =====================================================
-- MIGRACIÓN 020: ARREGLO CRÍTICO DE RLS PARA PROJECTS
-- =====================================================
-- PROBLEMA: Múltiples políticas conflictivas causan que los proyectos no carguen
-- SOLUCIÓN: Limpiar todas las políticas y crear un set simple y funcional

-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES DE PROJECTS
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
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can view their assigned projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;

-- 2. CREAR POLÍTICAS SIMPLES Y FUNCIONALES

-- Admin y super_admin: acceso total
CREATE POLICY "admin_full_access" ON projects
  FOR ALL TO authenticated
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

-- Gerente: ver todos, crear y editar
CREATE POLICY "gerente_manage_projects" ON projects
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
    )
  );

-- Supervisor: ver todos, crear y editar asignados
CREATE POLICY "supervisor_view_all_projects" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supervisor'
    )
  );

CREATE POLICY "supervisor_manage_own_projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supervisor'
    )
  );

CREATE POLICY "supervisor_update_assigned_projects" ON projects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supervisor'
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.is_active = true
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supervisor'
    )
  );

-- Residente: ver solo proyectos asignados
CREATE POLICY "residente_view_assigned" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'residente'
    )
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.is_active = true
    )
  );

-- Cliente: ver proyectos de su empresa
CREATE POLICY "cliente_view_company" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cliente'
      AND profiles.company_id = projects.client_company_id
    )
  );

-- 3. VERIFICAR QUE RLS ESTÉ HABILITADO
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. LIMPIAR POLÍTICAS DE COMPANIES (pueden estar causando problemas en el JOIN)
DROP POLICY IF EXISTS "admin_full_access_companies" ON companies;
DROP POLICY IF EXISTS "Users can view active companies" ON companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON companies;

-- 5. CREAR POLÍTICAS PARA COMPANIES
-- Admin, gerente y supervisor pueden ver empresas activas
CREATE POLICY "management_view_companies" ON companies
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'gerente', 'supervisor')
    )
  );

-- Cliente puede ver solo su empresa
CREATE POLICY "cliente_view_own_company" ON companies
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cliente'
      AND profiles.company_id = companies.id
    )
  );

-- Admin puede gestionar empresas
CREATE POLICY "admin_manage_companies" ON companies
  FOR ALL TO authenticated
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

-- 6. VERIFICAR QUE RLS ESTÉ HABILITADO EN COMPANIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

COMMENT ON POLICY "admin_full_access" ON projects IS 'Admin y super_admin tienen acceso total a proyectos';
COMMENT ON POLICY "gerente_manage_projects" ON projects IS 'Gerente puede ver y gestionar todos los proyectos';
COMMENT ON POLICY "supervisor_view_all_projects" ON projects IS 'Supervisor puede ver todos los proyectos';
COMMENT ON POLICY "supervisor_manage_own_projects" ON projects IS 'Supervisor puede crear proyectos';
COMMENT ON POLICY "supervisor_update_assigned_projects" ON projects IS 'Supervisor puede editar proyectos asignados';
COMMENT ON POLICY "residente_view_assigned" ON projects IS 'Residente solo ve proyectos asignados';
COMMENT ON POLICY "cliente_view_company" ON projects IS 'Cliente ve proyectos de su empresa';
COMMENT ON POLICY "management_view_companies" ON companies IS 'Admin, gerente y supervisor pueden ver empresas activas';
COMMENT ON POLICY "cliente_view_own_company" ON companies IS 'Cliente solo ve su propia empresa';
COMMENT ON POLICY "admin_manage_companies" ON companies IS 'Admin gestiona empresas';
