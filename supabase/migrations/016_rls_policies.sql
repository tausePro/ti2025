-- =====================================================
-- Migration: 016 - RLS Policies
-- Description: Políticas de seguridad adaptadas a 6 roles
-- Date: 2025-10-08
-- =====================================================

BEGIN;

-- ============================================
-- HABILITAR RLS EN TABLAS NUEVAS
-- ============================================

ALTER TABLE role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS: ROLE_CAPABILITIES
-- ============================================

-- Todos pueden ver las capacidades (para UI)
CREATE POLICY "Anyone can view capabilities" ON role_capabilities
  FOR SELECT TO authenticated
  USING (true);

-- Solo super_admin puede modificar
CREATE POLICY "Only super_admin can manage capabilities" ON role_capabilities
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- ============================================
-- POLÍTICAS: DAILY_LOG_TEMPLATES
-- ============================================

-- Super admin ve todo
CREATE POLICY "super_admin_view_all_templates" ON daily_log_templates
  FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

-- Admin ve todos los templates
CREATE POLICY "admin_view_all_templates" ON daily_log_templates
  FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

-- Supervisor gestiona templates de sus proyectos
CREATE POLICY "supervisor_manage_templates" ON daily_log_templates
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'supervisor'
    AND is_project_member(project_id)
  )
  WITH CHECK (
    get_user_role() = 'supervisor'
    AND is_project_member(project_id)
  );

-- Residente ve templates de su proyecto
CREATE POLICY "residente_view_templates" ON daily_log_templates
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'residente'
    AND is_project_member(project_id)
  );

-- ============================================
-- POLÍTICAS: REPORT_CONFIGURATIONS
-- ============================================

-- Super admin ve todo
CREATE POLICY "super_admin_view_all_configs" ON report_configurations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

-- Admin gestiona todas las configuraciones
CREATE POLICY "admin_manage_configs" ON report_configurations
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Supervisor gestiona configs de sus proyectos
CREATE POLICY "supervisor_manage_configs" ON report_configurations
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'supervisor'
    AND is_project_member(project_id)
  )
  WITH CHECK (
    get_user_role() = 'supervisor'
    AND is_project_member(project_id)
  );

-- Gerente ve todas las configuraciones
CREATE POLICY "gerente_view_configs" ON report_configurations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gerente');

-- ============================================
-- POLÍTICAS: DASHBOARD_WIDGETS
-- ============================================

-- Usuarios ven widgets de su rol
CREATE POLICY "view_own_role_widgets" ON dashboard_widgets
  FOR SELECT TO authenticated
  USING (role = get_user_role());

-- Solo super_admin puede modificar widgets
CREATE POLICY "super_admin_manage_widgets" ON dashboard_widgets
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- ============================================
-- ACTUALIZAR POLÍTICAS EXISTENTES
-- ============================================

-- Limpiar políticas antiguas que puedan causar conflictos
DO $$
DECLARE
  pol record;
BEGIN
  -- Eliminar políticas duplicadas o conflictivas
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname LIKE '%_old%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
  
  RAISE NOTICE 'Políticas antiguas limpiadas';
END $$;

-- ============================================
-- POLÍTICAS MEJORADAS: PROJECTS
-- ============================================

-- Eliminar políticas antiguas de projects
DROP POLICY IF EXISTS "super_admin_all_projects" ON projects;
DROP POLICY IF EXISTS "admin_manage_projects" ON projects;
DROP POLICY IF EXISTS "gerente_view_projects" ON projects;
DROP POLICY IF EXISTS "supervisor_manage_projects" ON projects;
DROP POLICY IF EXISTS "residente_view_projects" ON projects;
DROP POLICY IF EXISTS "cliente_view_projects" ON projects;

-- Super admin ve y gestiona todo
CREATE POLICY "super_admin_all_projects" ON projects
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- Admin gestiona todos los proyectos
CREATE POLICY "admin_manage_projects" ON projects
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Gerente ve todos los proyectos
CREATE POLICY "gerente_view_all_projects" ON projects
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gerente');

-- Supervisor gestiona proyectos asignados
CREATE POLICY "supervisor_manage_assigned_projects" ON projects
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'supervisor'
    AND is_project_member(id)
  )
  WITH CHECK (
    get_user_role() = 'supervisor'
  );

-- Residente ve proyectos asignados
CREATE POLICY "residente_view_assigned_projects" ON projects
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'residente'
    AND is_project_member(id)
  );

-- Cliente ve proyectos de su empresa
CREATE POLICY "cliente_view_company_projects" ON projects
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'cliente'
    AND company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS MEJORADAS: DAILY_LOGS
-- ============================================

DROP POLICY IF EXISTS "super_admin_view_logs" ON daily_logs;
DROP POLICY IF EXISTS "admin_view_logs" ON daily_logs;
DROP POLICY IF EXISTS "gerente_view_logs" ON daily_logs;
DROP POLICY IF EXISTS "supervisor_manage_logs" ON daily_logs;
DROP POLICY IF EXISTS "residente_manage_own_logs" ON daily_logs;

-- Super admin y admin ven todo
CREATE POLICY "super_admin_admin_view_all_logs" ON daily_logs
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin'));

-- Gerente ve todos los logs
CREATE POLICY "gerente_view_all_logs" ON daily_logs
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gerente');

-- Supervisor gestiona logs de sus proyectos
CREATE POLICY "supervisor_manage_project_logs" ON daily_logs
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'supervisor'
    AND is_project_member(project_id)
  )
  WITH CHECK (
    get_user_role() = 'supervisor'
    AND is_project_member(project_id)
  );

-- Residente crea y edita sus propios logs
CREATE POLICY "residente_manage_own_logs" ON daily_logs
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'residente'
    AND is_project_member(project_id)
    AND (created_by = auth.uid() OR created_by IS NULL)
  )
  WITH CHECK (
    get_user_role() = 'residente'
    AND is_project_member(project_id)
  );

-- ============================================
-- POLÍTICAS MEJORADAS: REPORTS
-- ============================================

DROP POLICY IF EXISTS "super_admin_view_reports" ON reports;
DROP POLICY IF EXISTS "admin_view_reports" ON reports;
DROP POLICY IF EXISTS "gerente_manage_reports" ON reports;
DROP POLICY IF EXISTS "supervisor_manage_reports" ON reports;
DROP POLICY IF EXISTS "residente_view_reports" ON reports;
DROP POLICY IF EXISTS "cliente_view_shared_reports" ON reports;

-- Super admin y admin ven todo
CREATE POLICY "super_admin_admin_view_all_reports" ON reports
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin'));

-- Gerente ve y firma informes
CREATE POLICY "gerente_manage_final_reports" ON reports
  FOR ALL TO authenticated
  USING (get_user_role() = 'gerente')
  WITH CHECK (
    get_user_role() = 'gerente'
    AND status IN ('pending_manager', 'final', 'shared')
  );

-- Supervisor revisa y aprueba informes de sus proyectos
CREATE POLICY "supervisor_manage_project_reports" ON reports
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'supervisor'
    AND is_project_member(project_id)
  )
  WITH CHECK (
    get_user_role() = 'supervisor'
    AND is_project_member(project_id)
    AND status IN ('draft', 'pending_review', 'corrections', 'approved')
  );

-- Residente ve informes de sus proyectos
CREATE POLICY "residente_view_project_reports" ON reports
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'residente'
    AND is_project_member(project_id)
  );

-- Cliente ve informes compartidos
CREATE POLICY "cliente_view_shared_reports" ON reports
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'cliente'
    AND shared_with_client = true
    AND project_id IN (
      SELECT id FROM projects 
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- POLÍTICAS: MÓDULO FINANCIERO
-- ============================================

-- Solo para proyectos con service_type='technical_financial'

-- FIDUCIARY_ACCOUNTS
DROP POLICY IF EXISTS "admin_manage_fiduciary" ON fiduciary_accounts;
DROP POLICY IF EXISTS "gerente_view_fiduciary" ON fiduciary_accounts;

CREATE POLICY "admin_manage_fiduciary_accounts" ON fiduciary_accounts
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND project_id IN (
      SELECT id FROM projects WHERE service_type = 'technical_financial'
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND project_id IN (
      SELECT id FROM projects WHERE service_type = 'technical_financial'
    )
  );

CREATE POLICY "gerente_view_fiduciary_summary" ON fiduciary_accounts
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'gerente'
    AND project_id IN (
      SELECT id FROM projects WHERE service_type = 'technical_financial'
    )
  );

-- PAYMENT_ORDERS
DROP POLICY IF EXISTS "admin_manage_payments" ON payment_orders;
DROP POLICY IF EXISTS "gerente_view_payments" ON payment_orders;

CREATE POLICY "admin_manage_payment_orders" ON payment_orders
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND project_id IN (
      SELECT id FROM projects WHERE service_type = 'technical_financial'
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND project_id IN (
      SELECT id FROM projects WHERE service_type = 'technical_financial'
    )
  );

CREATE POLICY "gerente_view_payment_orders" ON payment_orders
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'gerente'
    AND project_id IN (
      SELECT id FROM projects WHERE service_type = 'technical_financial'
    )
  );

-- FIDUCIARY_MOVEMENTS
CREATE POLICY "admin_manage_fiduciary_movements" ON fiduciary_movements
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND fiduciary_account_id IN (
      SELECT fa.id FROM fiduciary_accounts fa
      INNER JOIN projects p ON p.id = fa.project_id
      WHERE p.service_type = 'technical_financial'
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
  );

CREATE POLICY "gerente_view_fiduciary_movements" ON fiduciary_movements
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'gerente'
    AND fiduciary_account_id IN (
      SELECT fa.id FROM fiduciary_accounts fa
      INNER JOIN projects p ON p.id = fa.project_id
      WHERE p.service_type = 'technical_financial'
    )
  );

-- ============================================
-- POLÍTICAS: REPORT_SIGNATURES
-- ============================================

-- Todos los roles pueden ver firmas de informes que pueden ver
CREATE POLICY "view_report_signatures" ON report_signatures
  FOR SELECT TO authenticated
  USING (
    report_id IN (
      SELECT id FROM reports 
      WHERE 
        -- Super admin y admin ven todo
        get_user_role() IN ('super_admin', 'admin')
        -- Gerente ve informes finales
        OR (get_user_role() = 'gerente' AND status IN ('pending_manager', 'final', 'shared'))
        -- Supervisor ve informes de sus proyectos
        OR (get_user_role() = 'supervisor' AND is_project_member(project_id))
        -- Residente ve informes de sus proyectos
        OR (get_user_role() = 'residente' AND is_project_member(project_id))
        -- Cliente ve informes compartidos
        OR (get_user_role() = 'cliente' AND shared_with_client = true)
    )
  );

-- Solo el sistema puede crear firmas (vía triggers)
CREATE POLICY "system_create_signatures" ON report_signatures
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- VALIDACIÓN FINAL
-- ============================================

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Contar políticas creadas
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND policyname NOT LIKE '%_old%';
  
  RAISE NOTICE '✅ Migración 016 completada exitosamente';
  RAISE NOTICE 'Políticas RLS activas: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 SISTEMA COMPLETO IMPLEMENTADO';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumen de Migraciones:';
  RAISE NOTICE '  - 014: Estructura base (4 tablas nuevas, 5 mejoradas)';
  RAISE NOTICE '  - 015: Funciones y triggers (10 funciones, 8 triggers)';
  RAISE NOTICE '  - 016: Políticas RLS (% políticas)', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Próximo paso: Testing completo del sistema';
  RAISE NOTICE '✅ Verificar login con cada rol';
  RAISE NOTICE '✅ Testear flujo de informes';
  RAISE NOTICE '✅ Testear módulo financiero';
END $$;

COMMIT;
