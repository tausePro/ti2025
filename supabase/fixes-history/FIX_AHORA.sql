-- =====================================================
-- FIX INMEDIATO - Ejecutar AHORA
-- =====================================================

-- 1. Actualizar tu rol a super_admin
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'admin@talentoinmobiliario.com';

-- 2. Verificar
SELECT email, role FROM profiles WHERE email = 'admin@talentoinmobiliario.com';

-- 3. Dar permisos completos a super_admin en role_permissions
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('super_admin', 'projects', 'create', true),
  ('super_admin', 'projects', 'read', true),
  ('super_admin', 'projects', 'update', true),
  ('super_admin', 'projects', 'delete', true),
  ('super_admin', 'companies', 'create', true),
  ('super_admin', 'companies', 'read', true),
  ('super_admin', 'companies', 'update', true),
  ('super_admin', 'companies', 'delete', true),
  ('super_admin', 'users', 'create', true),
  ('super_admin', 'users', 'read', true),
  ('super_admin', 'users', 'update', true),
  ('super_admin', 'users', 'delete', true),
  ('super_admin', 'reports', 'create', true),
  ('super_admin', 'reports', 'read', true),
  ('super_admin', 'reports', 'update', true),
  ('super_admin', 'reports', 'delete', true),
  ('super_admin', 'financial', 'create', true),
  ('super_admin', 'financial', 'read', true),
  ('super_admin', 'financial', 'update', true),
  ('super_admin', 'financial', 'delete', true)
ON CONFLICT (role, module, action) DO UPDATE
SET allowed = true;

-- 4. Verificar permisos
SELECT * FROM role_permissions WHERE role = 'super_admin';
