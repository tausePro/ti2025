-- DIAGNÓSTICO Y SOLUCIÓN PARA EL PROBLEMA DE ROLES Y LOGOUT
-- Ejecuta este script en Supabase SQL Editor

-- 1. DIAGNÓSTICO: Verificar estado actual del usuario
SELECT
    '=== DIAGNÓSTICO USUARIO ===' as section;

SELECT
    au.id,
    au.email,
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data as user_metadata,
    p.id as profile_id,
    p.email as profile_email,
    p.role as profile_role,
    p.full_name,
    p.is_active,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at,
    CASE
        WHEN p.id IS NULL THEN '❌ SIN PERFIL'
        WHEN p.role IS NULL OR p.role = '' THEN '⚠️ ROL VACÍO'
        WHEN p.role = 'super_admin' THEN '✅ SUPER_ADMIN'
        WHEN p.role = 'admin' THEN '⚠️ ADMIN (PROBLEMA)'
        ELSE '❓ ROL DESCONOCIDO: ' || p.role
    END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'admin@talentoInmobiliario.com'
ORDER BY au.created_at DESC
LIMIT 1;

-- 2. Verificar permisos actuales
SELECT
    '=== PERMISOS ACTUALES ===' as section;

SELECT
    role,
    module,
    action,
    allowed,
    COUNT(*) as count
FROM role_permissions
WHERE role IN ('super_admin', 'admin')
GROUP BY role, module, action, allowed
ORDER BY role, module, action;

-- 3. Verificar políticas RLS que podrían estar causando problemas
SELECT
    '=== POLÍTICAS RLS EN PROFILES ===' as section;

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 4. SOLUCIÓN: Crear/actualizar perfil del super admin
SELECT
    '=== APLICANDO SOLUCIÓN ===' as section;

-- Crear o actualizar el perfil del super admin
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', 'Super Admin'),
    'super_admin',
    true,
    COALESCE(p.created_at, NOW()),
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'admin@talentoInmobiliario.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    is_active = true,
    updated_at = NOW();

-- 5. Verificar que los permisos de super_admin existan
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

-- 6. Verificar resultado final
SELECT
    '=== RESULTADO FINAL ===' as section;

SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    COUNT(rp.id) as permissions_count
FROM profiles p
LEFT JOIN role_permissions rp ON p.role::text = rp.role AND rp.allowed = true
WHERE p.email = 'admin@talentoInmobiliario.com'
GROUP BY p.id, p.email, p.full_name, p.role, p.is_active;

-- 7. Verificar permisos finales
SELECT
    '=== PERMISOS FINALES ===' as section;

SELECT
    role,
    module,
    action,
    allowed
FROM role_permissions
WHERE role = 'super_admin'
ORDER BY module, action;