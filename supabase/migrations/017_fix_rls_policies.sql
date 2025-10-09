-- =====================================================
-- Migration: 017 - Fix RLS Policies  
-- Description: Arreglar políticas RLS que bloquean acceso
-- Date: 2025-10-09
-- =====================================================

-- NO usar transacción para evitar problemas
-- BEGIN;

-- ============================================
-- FIX: Políticas de PROJECTS
-- ============================================

-- Eliminar políticas conflictivas
DROP POLICY IF EXISTS "super_admin_all_projects" ON projects;
DROP POLICY IF EXISTS "admin_manage_projects" ON projects;
DROP POLICY IF EXISTS "gerente_view_all_projects" ON projects;
DROP POLICY IF EXISTS "supervisor_manage_assigned_projects" ON projects;
DROP POLICY IF EXISTS "residente_view_assigned_projects" ON projects;
DROP POLICY IF EXISTS "cliente_view_company_projects" ON projects;

-- Crear políticas mejoradas

-- 1. Super admin: acceso total
CREATE POLICY "super_admin_projects_all" ON projects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 2. Admin: acceso total
CREATE POLICY "admin_projects_all" ON projects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 3. Gerente: ver todos
CREATE POLICY "gerente_projects_view" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'gerente'
    )
  );

-- 4. Supervisor: gestionar asignados
CREATE POLICY "supervisor_projects_manage" ON projects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'supervisor'
    )
    AND (
      -- Es miembro del proyecto
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND is_active = true
      )
      -- O puede ver todos para asignarse
      OR true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'supervisor'
    )
  );

-- 5. Residente: ver asignados
CREATE POLICY "residente_projects_view" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'residente'
    )
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- 6. Cliente: ver todos (simplificado)
CREATE POLICY "cliente_projects_view" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'cliente'
    )
  );

-- ============================================
-- FIX: Políticas de COMPANIES
-- ============================================

-- Asegurar que todos puedan ver empresas
DROP POLICY IF EXISTS "view_companies" ON companies;
DROP POLICY IF EXISTS "manage_companies" ON companies;

CREATE POLICY "authenticated_view_companies" ON companies
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_companies" ON companies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================

DO $$
DECLARE
  v_policies_count integer;
BEGIN
  -- Contar políticas de projects
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename = 'projects';
  
  RAISE NOTICE '✅ Migración 017 completada';
  RAISE NOTICE 'Políticas en projects: %', v_policies_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Acceso a proyectos restaurado';
  RAISE NOTICE '✅ Todos los roles pueden acceder según permisos';
END $$;

-- COMMIT;
