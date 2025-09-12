-- Corregir políticas RLS para la tabla companies
-- Permitir inserción y actualización para usuarios autenticados

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;

-- Crear nuevas políticas más permisivas para desarrollo
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

-- También corregir políticas para profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update profiles" 
ON public.profiles FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Corregir políticas para projects
DROP POLICY IF EXISTS "Users can view their assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;

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

-- Comentarios:
-- Estas políticas son más permisivas para desarrollo
-- En producción, se deben ajustar según los roles específicos
