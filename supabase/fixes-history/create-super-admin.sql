-- Script para crear usuario super admin
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que el usuario existe
SELECT id, email, full_name, role 
FROM profiles 
WHERE email = 'admin@talentoinmobiliario.com';

-- 2. Promover a super admin
SELECT public.promote_to_super_admin('admin@talentoinmobiliario.com');

-- 3. Verificar el cambio
SELECT id, email, full_name, role 
FROM profiles 
WHERE email = 'admin@talentoinmobiliario.com';
