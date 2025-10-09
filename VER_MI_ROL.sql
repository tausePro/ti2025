-- Ver tu usuario actual y rol
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
FROM profiles
WHERE id = auth.uid();

-- Ver TODOS los usuarios
SELECT
  email,
  role,
  is_active
FROM profiles
ORDER BY created_at DESC;
