-- Migrar datos de tabla users a profiles
-- Ejecutar DESPUÉS de crear la tabla profiles

-- 1. Migrar datos existentes de users a profiles
INSERT INTO public.profiles (
  id, 
  email, 
  full_name, 
  phone, 
  role, 
  professional_license, 
  is_active, 
  created_at, 
  updated_at
)
SELECT 
  id,
  email,
  full_name,
  phone,
  COALESCE(role, 'residente') as role,
  professional_license,
  COALESCE(is_active, true) as is_active,
  created_at,
  updated_at
FROM public.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = users.id
);

-- 2. Verificar migración
SELECT 
  'Migración completada' as status,
  (SELECT COUNT(*) FROM public.users) as users_count,
  (SELECT COUNT(*) FROM public.profiles) as profiles_count;

-- 3. Mostrar usuarios migrados
SELECT id, email, full_name, role, is_active 
FROM public.profiles 
ORDER BY created_at;
