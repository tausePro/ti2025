-- =====================================================
-- DEBUG: Verificar por qué el rol cambia
-- =====================================================

-- PASO 1: Ver TODOS los usuarios y sus roles
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
FROM profiles
ORDER BY created_at DESC;

-- PASO 2: ¿Cuál es TU email? Copia el email que ves arriba y úsalo aquí:
-- Reemplaza 'TU-EMAIL-AQUI' con tu email real
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  'Este eres tú' as nota
FROM profiles
WHERE email = 'TU-EMAIL-AQUI';

-- PASO 3: Actualizar TU rol a super_admin
-- Reemplaza 'TU-EMAIL-AQUI' con tu email real
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'TU-EMAIL-AQUI';

-- PASO 4: Verificar que se actualizó
SELECT
  email,
  role,
  'Rol actualizado' as status
FROM profiles
WHERE email = 'TU-EMAIL-AQUI';
