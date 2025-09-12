-- Crear usuario admin completo
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si el usuario admin existe en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@talentoinmobiliario.com';

-- 2. Si no existe, necesitamos crearlo manualmente
-- (Esto se hace desde el dashboard de Supabase Auth, no desde SQL)

-- 3. Verificar que el perfil existe
SELECT * FROM public.profiles 
WHERE email = 'admin@talentoinmobiliario.com';

-- 4. Si el perfil no existe, crearlo (asumiendo que el usuario existe en auth.users)
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Administrador'),
  'super_admin',
  true
FROM auth.users 
WHERE email = 'admin@talentoinmobiliario.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- 5. Verificar que se creó/actualizó correctamente
SELECT * FROM public.profiles 
WHERE email = 'admin@talentoinmobiliario.com';
