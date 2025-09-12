-- Limpiar base de datos para testing
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar todas las empresas existentes
DELETE FROM public.companies;

-- 2. Eliminar todos los proyectos existentes
DELETE FROM public.projects;

-- 3. Verificar que las tablas están vacías
SELECT 'companies' as tabla, COUNT(*) as registros FROM public.companies
UNION ALL
SELECT 'projects' as tabla, COUNT(*) as registros FROM public.projects
UNION ALL
SELECT 'profiles' as tabla, COUNT(*) as registros FROM public.profiles;
