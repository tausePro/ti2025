-- SOLUCIÓN TEMPORAL: Desactivar RLS para permitir guardado
-- ⚠️ SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN

-- Desactivar RLS temporalmente en las tablas principales
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está desactivado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('companies', 'profiles', 'projects', 'project_members', 'daily_logs')
AND schemaname = 'public';

-- Mensaje de confirmación
SELECT 'RLS desactivado temporalmente para desarrollo' as status;
