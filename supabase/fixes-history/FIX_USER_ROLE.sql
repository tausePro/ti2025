-- Script para verificar y corregir el rol del usuario
-- Ejecuta esto en Supabase SQL Editor

-- 1. Verificar el usuario actual y su rol
SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    au.email as auth_email,
    au.created_at as auth_created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- 2. Si el usuario tiene rol 'admin' pero debería ser 'super_admin', actualizarlo
-- Reemplaza 'USER_EMAIL_HERE' con el email real del usuario
UPDATE profiles
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'USER_EMAIL_HERE' AND role = 'admin';

-- 3. Verificar que los permisos de super_admin existen
INSERT INTO role_permissions (role, module, action, allowed)
SELECT 'super_admin', module, action, true
FROM (VALUES
    ('projects', 'create'),
    ('projects', 'read'),
    ('projects', 'update'),
    ('projects', 'delete'),
    ('reports', 'create'),
    ('reports', 'read'),
    ('companies', 'create'),
    ('companies', 'read'),
    ('users', 'create'),
    ('users', 'read'),
    ('bitacora', 'create'),
    ('bitacora', 'read'),
    ('financial', 'create'),
    ('financial', 'read')
) AS t(module, action)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role = 'super_admin'
    AND module = t.module
    AND action = t.action
);

-- 4. Verificar permisos después de la actualización
SELECT
    role,
    module,
    action,
    allowed
FROM role_permissions
WHERE role = 'super_admin'
ORDER BY module, action;