-- =====================================================
-- MIGRACIÓN 022: FIX RECURSIÓN INFINITA EN POLÍTICAS
-- =====================================================
-- PROBLEMA: Recursión infinita entre companies y user_company_permissions
-- SOLUCIÓN: Políticas simples sin referencias circulares

-- 1. ELIMINAR TODAS LAS POLÍTICAS DE COMPANIES
DROP POLICY IF EXISTS "management_view_companies" ON companies;
DROP POLICY IF EXISTS "cliente_view_own_company" ON companies;
DROP POLICY IF EXISTS "admin_manage_companies" ON companies;
DROP POLICY IF EXISTS "allow_view_companies_for_projects" ON companies;
DROP POLICY IF EXISTS "companies_allow_all" ON companies;
DROP POLICY IF EXISTS "authenticated_view_companies" ON companies;

-- 2. CREAR POLÍTICA SIMPLE PARA COMPANIES
-- Todos los usuarios autenticados pueden VER empresas activas (necesario para JOINs)
CREATE POLICY "authenticated_can_view_active_companies" ON companies
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Solo admin puede gestionar empresas
CREATE POLICY "admin_can_manage_companies" ON companies
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

-- 3. VERIFICAR POLÍTICAS DE USER_COMPANY_PERMISSIONS
-- Eliminar políticas que puedan causar recursión
DROP POLICY IF EXISTS "Super admins can manage all company roles" ON user_company_permissions;
DROP POLICY IF EXISTS "Company admins can manage their company roles" ON user_company_permissions;
DROP POLICY IF EXISTS "Users can view their own company permissions" ON user_company_permissions;

-- Crear política simple para user_company_permissions
CREATE POLICY "users_can_view_own_permissions" ON user_company_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admin_can_manage_permissions" ON user_company_permissions
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

COMMENT ON POLICY "authenticated_can_view_active_companies" ON companies IS 
'Todos los usuarios autenticados pueden ver empresas activas (necesario para JOINs en projects)';

COMMENT ON POLICY "admin_can_manage_companies" ON companies IS 
'Solo admin y super_admin pueden gestionar empresas';

COMMENT ON POLICY "users_can_view_own_permissions" ON user_company_permissions IS 
'Los usuarios pueden ver sus propios permisos de empresa';

COMMENT ON POLICY "admin_can_manage_permissions" ON user_company_permissions IS 
'Admin puede gestionar todos los permisos de empresa';
