-- Corregir políticas RLS para permitir creación de usuarios
-- Solucionar el error "User not allowed" al crear usuarios

-- 1. Eliminar políticas problemáticas para profiles
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Crear políticas más permisivas para desarrollo
-- Permitir a usuarios autenticados ver todos los perfiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Permitir a usuarios autenticados crear perfiles
CREATE POLICY "Authenticated users can create profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Permitir a usuarios autenticados actualizar perfiles
CREATE POLICY "Authenticated users can update profiles" 
ON public.profiles FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Permitir a usuarios autenticados eliminar perfiles
CREATE POLICY "Authenticated users can delete profiles" 
ON public.profiles FOR DELETE 
USING (auth.role() = 'authenticated');

-- 3. Corregir políticas para role_permissions
DROP POLICY IF EXISTS "Super admins can manage role permissions" ON public.role_permissions;

CREATE POLICY "Authenticated users can view role permissions" 
ON public.role_permissions FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage role permissions" 
ON public.role_permissions FOR ALL 
USING (auth.role() = 'authenticated');

-- 4. Corregir políticas para user_custom_permissions
DROP POLICY IF EXISTS "Super admins can manage custom permissions" ON public.user_custom_permissions;
DROP POLICY IF EXISTS "Users can read own custom permissions" ON public.user_custom_permissions;

CREATE POLICY "Authenticated users can view custom permissions" 
ON public.user_custom_permissions FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage custom permissions" 
ON public.user_custom_permissions FOR ALL 
USING (auth.role() = 'authenticated');

-- 5. Verificar que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Crear función helper para verificar permisos de usuario
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_module TEXT,
  p_action TEXT,
  p_project_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_has_permission BOOLEAN;
  v_custom_permission BOOLEAN;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO v_user_role 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  -- Si no existe el usuario, denegar acceso
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si es super_admin, permitir todo
  IF v_user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Verificar permisos personalizados primero (específicos por proyecto)
  IF p_project_id IS NOT NULL THEN
    SELECT allowed INTO v_custom_permission
    FROM public.user_custom_permissions
    WHERE user_id = p_user_id 
    AND module = p_module 
    AND action = p_action
    AND project_id = p_project_id;
    
    IF v_custom_permission IS NOT NULL THEN
      RETURN v_custom_permission;
    END IF;
  END IF;
  
  -- Verificar permisos personalizados generales
  SELECT allowed INTO v_custom_permission
  FROM public.user_custom_permissions
  WHERE user_id = p_user_id 
  AND module = p_module 
  AND action = p_action
  AND project_id IS NULL;
  
  IF v_custom_permission IS NOT NULL THEN
    RETURN v_custom_permission;
  END IF;
  
  -- Verificar permisos del rol
  SELECT allowed INTO v_has_permission
  FROM public.role_permissions
  WHERE role = v_user_role 
  AND module = p_module 
  AND action = p_action;
  
  -- Si es un proyecto específico, verificar membresía para roles no administrativos
  IF p_project_id IS NOT NULL AND v_has_permission = true THEN
    IF v_user_role NOT IN ('super_admin', 'admin', 'gerente') THEN
      RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
        AND user_id = p_user_id
        AND is_active = true
      );
    END IF;
  END IF;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comentarios sobre las políticas
-- Estas políticas son más permisivas para desarrollo y testing
-- En producción, se deberían implementar políticas más restrictivas
-- basadas en roles específicos y permisos granulares
