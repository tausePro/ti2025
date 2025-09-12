-- Crear función para promover usuario a super admin
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Actualizar el rol del usuario en la tabla profiles
  UPDATE public.profiles 
  SET role = 'super_admin', updated_at = NOW()
  WHERE email = user_email;
  
  -- Verificar que se actualizó correctamente
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Crear función para manejar nuevos usuarios (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    'cliente', -- Rol por defecto
    true
  );
  RETURN NEW;
END;
$$;

-- Crear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar trigger updated_at a profiles
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Aplicar trigger updated_at a companies
DROP TRIGGER IF EXISTS handle_updated_at ON public.companies;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Aplicar trigger updated_at a projects
DROP TRIGGER IF EXISTS handle_updated_at ON public.projects;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
