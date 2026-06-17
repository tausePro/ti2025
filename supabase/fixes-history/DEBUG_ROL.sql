-- =====================================================
-- DEBUG: Verificar y corregir rol de usuario
-- =====================================================

-- 1. Ver todos los usuarios y sus roles
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 2. Ver usuarios en auth.users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- 3. Actualizar rol a super_admin (EJECUTAR ESTO)
-- Reemplaza 'tu-email@ejemplo.com' con tu email real
UPDATE profiles 
SET 
  role = 'super_admin',
  is_active = true,
  updated_at = NOW()
WHERE email = 'tu-email@ejemplo.com';

-- 4. Verificar que se actualizó
SELECT 
  id,
  email,
  full_name,
  role,
  is_active
FROM profiles
WHERE email = 'tu-email@ejemplo.com';

-- 5. Ver permisos del rol super_admin
SELECT 
  role,
  module,
  action,
  allowed
FROM role_permissions
WHERE role = 'super_admin'
ORDER BY module, action;
