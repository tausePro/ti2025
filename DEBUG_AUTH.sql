-- =====================================================
-- DEBUG: Verificar autenticación y políticas
-- =====================================================

-- 1. Ver tu ID de usuario actual
SELECT auth.uid() as mi_user_id;

-- 2. Ver tu perfil con ese ID
SELECT 
  id,
  email,
  role,
  is_active
FROM profiles
WHERE id = auth.uid();

-- 3. Probar la condición de la política de super_admin
SELECT EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role = 'super_admin'
) as tengo_acceso_super_admin;

-- 4. Ver TODAS las políticas activas en projects
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- 5. Probar acceso directo a projects (sin RLS)
SET LOCAL row_security = off;
SELECT COUNT(*) as total_projects FROM projects;
SET LOCAL row_security = on;

-- 6. Probar acceso con RLS activo
SELECT COUNT(*) as projects_con_rls FROM projects;
