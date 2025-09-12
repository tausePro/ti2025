-- Verificar usuario admin
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si existe en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@talentoinmobiliario.com';

-- 2. Verificar si existe en profiles
SELECT * FROM public.profiles 
WHERE email = 'admin@talentoinmobiliario.com';

-- 3. Si no existe en profiles, crearlo
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

-- 4. Verificar que se creó/actualizó correctamente
SELECT * FROM public.profiles 
WHERE email = 'admin@talentoinmobiliario.com';
