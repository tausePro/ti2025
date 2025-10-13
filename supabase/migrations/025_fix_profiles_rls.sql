-- =====================================================
-- MIGRACIÓN 025: FIX POLÍTICAS RLS DE PROFILES
-- =====================================================
-- PROBLEMA: Políticas conflictivas en profiles impiden cargar perfil al recargar
-- SOLUCIÓN: Limpiar y crear políticas simples

-- 1. ELIMINAR TODAS LAS POLÍTICAS DE PROFILES
DROP POLICY IF EXISTS "profiles_allow_all" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can create profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

-- 2. CREAR POLÍTICAS SIMPLES PARA PROFILES
-- Todos los usuarios autenticados pueden ver todos los perfiles (necesario para el sistema)
CREATE POLICY "authenticated_can_view_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Solo admin puede crear perfiles
CREATE POLICY "admin_can_create_profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Solo admin puede eliminar perfiles
CREATE POLICY "admin_can_delete_profiles" ON profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin puede actualizar cualquier perfil
CREATE POLICY "admin_can_update_any_profile" ON profiles
  FOR UPDATE TO authenticated
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

COMMENT ON POLICY "authenticated_can_view_profiles" ON profiles IS 
'Todos los usuarios autenticados pueden ver perfiles (necesario para el sistema)';

COMMENT ON POLICY "users_can_update_own_profile" ON profiles IS 
'Los usuarios pueden actualizar su propio perfil';

COMMENT ON POLICY "admin_can_create_profiles" ON profiles IS 
'Solo admin puede crear nuevos perfiles';

COMMENT ON POLICY "admin_can_delete_profiles" ON profiles IS 
'Solo admin puede eliminar perfiles';

COMMENT ON POLICY "admin_can_update_any_profile" ON profiles IS 
'Admin puede actualizar cualquier perfil';
