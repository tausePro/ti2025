-- Agregar columna created_by a la tabla companies
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna created_by
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;
