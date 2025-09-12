-- Script para arreglar RLS sin recursión
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar todas las políticas problemáticas
DROP POLICY IF EXISTS "super_admin_profiles_all" ON public.profiles;
DROP POLICY IF EXISTS "super_admin_companies_all" ON public.companies;
DROP POLICY IF EXISTS "super_admin_projects_all" ON public.projects;
DROP POLICY IF EXISTS "super_admin_role_permissions_select" ON public.role_permissions;

-- 2. Deshabilitar RLS temporalmente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- 3. Crear políticas sin recursión
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Política para profiles: permitir todo (sin recursión)
CREATE POLICY "profiles_allow_all" 
ON public.profiles FOR ALL 
USING (true);

-- Política para companies: permitir todo (sin recursión)
CREATE POLICY "companies_allow_all" 
ON public.companies FOR ALL 
USING (true);

-- Política para projects: permitir todo (sin recursión)
CREATE POLICY "projects_allow_all" 
ON public.projects FOR ALL 
USING (true);

-- Política para role_permissions: permitir lectura (sin recursión)
CREATE POLICY "role_permissions_allow_select" 
ON public.role_permissions FOR SELECT 
USING (true);

-- 4. Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
