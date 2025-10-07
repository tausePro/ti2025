-- Script completo para arreglar RLS
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can do everything with companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can do everything with projects" ON public.projects;
DROP POLICY IF EXISTS "Super admins can view role permissions" ON public.role_permissions;

-- 2. Deshabilitar RLS temporalmente para testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que el usuario de desarrollo existe y es super_admin
SELECT id, email, role FROM public.profiles WHERE email = 'dev@example.com';

-- 4. Crear políticas más simples y específicas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Política para profiles: permitir todo a super_admin
CREATE POLICY "super_admin_profiles_all" 
ON public.profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- Política para companies: permitir todo a super_admin
CREATE POLICY "super_admin_companies_all" 
ON public.companies FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- Política para projects: permitir todo a super_admin
CREATE POLICY "super_admin_projects_all" 
ON public.projects FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- Política para role_permissions: permitir lectura a super_admin
CREATE POLICY "super_admin_role_permissions_select" 
ON public.role_permissions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- 5. Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
