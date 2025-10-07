-- Arreglar perfiles duplicados
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si hay perfiles duplicados
SELECT email, COUNT(*) as count 
FROM public.profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 2. Eliminar perfiles duplicados (mantener el más reciente)
WITH duplicates AS (
  SELECT id, email, created_at,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM public.profiles
)
DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 3. Verificar que no hay duplicados
SELECT email, COUNT(*) as count 
FROM public.profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 4. Verificar el perfil del usuario dev
SELECT * FROM public.profiles WHERE email = 'dev@talentoinmobiliario.com';
