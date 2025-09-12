-- URGENTE: Ejecutar esto en Supabase SQL Editor para corregir el problema de guardado

-- 1. Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;

-- 2. Crear políticas permisivas para desarrollo
CREATE POLICY "Authenticated users can view companies" 
ON public.companies FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert companies" 
ON public.companies FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update companies" 
ON public.companies FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete companies" 
ON public.companies FOR DELETE 
USING (auth.role() = 'authenticated');

-- 3. Políticas para profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update profiles" 
ON public.profiles FOR UPDATE 
USING (auth.role() = 'authenticated');

-- 4. Políticas para projects
CREATE POLICY "Authenticated users can view projects" 
ON public.projects FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert projects" 
ON public.projects FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projects" 
ON public.projects FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete projects" 
ON public.projects FOR DELETE 
USING (auth.role() = 'authenticated');

-- 5. Verificar que las políticas se aplicaron
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('companies', 'profiles', 'projects')
ORDER BY tablename, policyname;
