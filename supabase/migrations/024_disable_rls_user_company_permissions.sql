-- =====================================================
-- MIGRACIÓN 024: DESHABILITAR RLS EN USER_COMPANY_PERMISSIONS
-- =====================================================
-- PROBLEMA: RLS en user_company_permissions causa recursión infinita
-- SOLUCIÓN: Deshabilitar RLS en esta tabla (es una tabla de configuración interna)

-- 1. ELIMINAR TODAS LAS POLÍTICAS DE USER_COMPANY_PERMISSIONS
DROP POLICY IF EXISTS "users_can_view_own_permissions" ON user_company_permissions;
DROP POLICY IF EXISTS "admin_can_manage_permissions" ON user_company_permissions;
DROP POLICY IF EXISTS "Super admins can manage all company roles" ON user_company_permissions;
DROP POLICY IF EXISTS "Company admins can manage their company roles" ON user_company_permissions;
DROP POLICY IF EXISTS "Users can view their own company permissions" ON user_company_permissions;

-- 2. DESHABILITAR RLS EN USER_COMPANY_PERMISSIONS
ALTER TABLE user_company_permissions DISABLE ROW LEVEL SECURITY;

-- 3. AHORA PODEMOS USAR user_company_permissions EN POLÍTICAS SIN RECURSIÓN
-- Recrear política correcta de cliente en projects
DROP POLICY IF EXISTS "cliente_view_company" ON projects;
DROP POLICY IF EXISTS "cliente_view_all_projects" ON projects;

CREATE POLICY "cliente_view_company_projects" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cliente'
    )
    AND EXISTS (
      SELECT 1 FROM user_company_permissions
      WHERE user_company_permissions.user_id = auth.uid()
      AND user_company_permissions.company_id = projects.client_company_id
      AND user_company_permissions.is_active = true
    )
  );

-- 4. RECREAR POLÍTICA CORRECTA DE CLIENTE EN COMPANIES
DROP POLICY IF EXISTS "cliente_view_own_company" ON companies;

CREATE POLICY "cliente_view_own_company" ON companies
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
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
  );

COMMENT ON TABLE user_company_permissions IS 
'Tabla de configuración sin RLS - los permisos se validan en las políticas de projects y companies';

COMMENT ON POLICY "cliente_view_company_projects" ON projects IS 
'Cliente solo ve proyectos de empresas donde tiene permisos activos';

COMMENT ON POLICY "cliente_view_own_company" ON companies IS 
'Cliente solo ve empresas donde tiene permisos activos';
