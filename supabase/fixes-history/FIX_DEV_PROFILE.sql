-- Arreglar perfil del usuario dev
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar todos los perfiles del usuario dev
DELETE FROM public.profiles WHERE email = 'dev@talentoinmobiliario.com';

-- 2. Crear un nuevo perfil para el usuario dev
INSERT INTO public.profiles (id, email, full_name, role, is_active)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'dev@talentoinmobiliario.com' LIMIT 1),
  'dev@talentoinmobiliario.com',
  'Usuario de Desarrollo',
  'super_admin',
  true
);

-- 3. Verificar que el perfil se creó correctamente
SELECT * FROM public.profiles WHERE email = 'dev@talentoinmobiliario.com';
