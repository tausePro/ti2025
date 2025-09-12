-- Crear usuario super_admin inicial para Talento Inmobiliario
-- Este script debe ejecutarse después de la migración 001_users_and_permissions.sql

-- Función para crear el perfil de super_admin cuando se registre el usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar perfil automáticamente cuando se crea un usuario en auth.users
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'residente' -- rol por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar el timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en profiles
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para actualizar updated_at en companies
DROP TRIGGER IF EXISTS handle_updated_at ON public.companies;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para actualizar updated_at en projects
DROP TRIGGER IF EXISTS handle_updated_at ON public.projects;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Función para promover usuario a super_admin (solo ejecutar manualmente)
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'super_admin'
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario con email % no encontrado', user_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insertar empresa Talento Inmobiliario (nuestra empresa)
INSERT INTO public.companies (
  name, 
  nit, 
  address, 
  phone, 
  email, 
  legal_representative,
  contact_person,
  is_active
) VALUES (
  'Talento Inmobiliario S.A.S',
  '900123456-1',
  'Calle 123 #45-67, Bogotá, Colombia',
  '+57 1 234 5678',
  'info@talentoinmobiliario.com',
  'Director General',
  'Administrador',
  true
) ON CONFLICT (nit) DO NOTHING;

-- Comentarios para el administrador:
-- 1. Después de ejecutar esta migración, registra tu usuario en la aplicación
-- 2. Luego ejecuta: SELECT public.promote_to_super_admin('tu-email@ejemplo.com');
-- 3. Esto te dará permisos de super_admin para gestionar todo el sistema
