-- Migración para políticas RLS de producción
-- Arquitectura segura y escalable

-- 1. Eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view project members of their projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can view logs of their projects" ON public.daily_logs;
DROP POLICY IF EXISTS "Residents and supervisors can create logs" ON public.daily_logs;

-- 2. Políticas para la tabla PROFILES
-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Los administradores pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- Los administradores pueden crear perfiles
CREATE POLICY "Admins can create profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- Los super admins pueden actualizar cualquier perfil
CREATE POLICY "Super admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- 3. Políticas para la tabla COMPANIES
-- Los administradores pueden gestionar empresas
CREATE POLICY "Admins can manage companies" 
ON public.companies FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- Los usuarios autenticados pueden ver empresas activas
CREATE POLICY "Authenticated users can view active companies" 
ON public.companies FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

-- 4. Políticas para la tabla PROJECTS
-- Los administradores pueden gestionar proyectos
CREATE POLICY "Admins can manage projects" 
ON public.projects FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- Los usuarios pueden ver proyectos donde son miembros
CREATE POLICY "Users can view assigned projects" 
ON public.projects FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = projects.id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- 5. Políticas para la tabla PROJECT_MEMBERS
-- Los administradores pueden gestionar miembros
CREATE POLICY "Admins can manage project members" 
ON public.project_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- Los usuarios pueden ver miembros de sus proyectos
CREATE POLICY "Users can view project members" 
ON public.project_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm2
    WHERE pm2.project_id = project_members.project_id 
    AND pm2.user_id = auth.uid() 
    AND pm2.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- 6. Políticas para la tabla DAILY_LOGS
-- Los administradores pueden gestionar bitácoras
CREATE POLICY "Admins can manage daily logs" 
ON public.daily_logs FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- Los usuarios pueden ver bitácoras de sus proyectos
CREATE POLICY "Users can view project logs" 
ON public.daily_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = daily_logs.project_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- Los residentes y supervisores pueden crear bitácoras
CREATE POLICY "Residents and supervisors can create logs" 
ON public.daily_logs FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = daily_logs.project_id 
    AND user_id = auth.uid() 
    AND role_in_project IN ('residente', 'supervisor')
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- 7. Políticas para la tabla ROLE_PERMISSIONS
-- Solo los super admins pueden gestionar permisos
CREATE POLICY "Super admins can manage role permissions" 
ON public.role_permissions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Los usuarios autenticados pueden leer permisos
CREATE POLICY "Authenticated users can read role permissions" 
ON public.role_permissions FOR SELECT 
USING (auth.role() = 'authenticated');

-- 8. Políticas para la tabla USER_CUSTOM_PERMISSIONS
-- Solo los super admins pueden gestionar permisos personalizados
CREATE POLICY "Super admins can manage custom permissions" 
ON public.user_custom_permissions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Los usuarios pueden leer sus propios permisos personalizados
CREATE POLICY "Users can read own custom permissions" 
ON public.user_custom_permissions FOR SELECT 
USING (user_id = auth.uid());

-- 9. Verificar que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_permissions ENABLE ROW LEVEL SECURITY;

-- 10. Crear función helper para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND role IN ('super_admin', 'admin', 'gerente')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Crear función helper para verificar si un usuario es super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Verificar políticas creadas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'companies', 'projects', 'project_members', 'daily_logs', 'role_permissions', 'user_custom_permissions')
ORDER BY tablename, policyname;
