-- =====================================================
-- DEBUG: Verificar acceso a proyectos
-- =====================================================

-- 1. Ver tu usuario y rol actual
SELECT
  id,
  email,
  full_name,
  role,
  is_active
FROM profiles
WHERE email = 'tu-email@ejemplo.com'; -- REEMPLAZA CON TU EMAIL

-- 2. Ver función get_user_role()
SELECT get_user_role();

-- 3. Ver todos los proyectos (sin RLS)
SELECT COUNT(*) as total_proyectos FROM projects;

-- 4. Ver proyectos con RLS activo
SELECT COUNT(*) as proyectos_visibles FROM projects;

-- 5. Ver políticas activas en projects
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- 6. Verificar si eres miembro de algún proyecto
SELECT
  pm.project_id,
  p.name as project_name,
  pm.role as member_role,
  pm.is_active
FROM project_members pm
INNER JOIN projects p ON p.id = pm.project_id
WHERE pm.user_id = auth.uid();

-- =====================================================
-- SOLUCIÓN TEMPORAL: Desactivar RLS en projects
-- =====================================================
-- SOLO PARA TESTING - NO USAR EN PRODUCCIÓN

-- Desactivar RLS temporalmente
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Reactivar RLS después de testing
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SOLUCIÓN PERMANENTE: Agregar política para tu rol
-- =====================================================

-- Si eres super_admin, esta política ya debería existir
-- Verificar que la política super_admin_all_projects existe:
SELECT * FROM pg_policies 
WHERE tablename = 'projects' 
AND policyname = 'super_admin_all_projects';
