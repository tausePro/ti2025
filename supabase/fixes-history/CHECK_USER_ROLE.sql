-- Script para verificar el rol del usuario actual
-- Ejecuta esto en Supabase SQL Editor

-- Verificar usuarios en la tabla profiles
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

-- Verificar permisos de roles
SELECT 
    role,
    module,
    action,
    allowed
FROM role_permissions
WHERE role IN ('super_admin', 'admin')
ORDER BY role, module, action;

-- Verificar si hay usuarios en auth.users
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    user_metadata
FROM auth.users
ORDER BY created_at DESC;