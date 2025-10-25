-- =====================================================
-- MIGRACIÓN 053: PERMISOS PARA MÓDULO PLANTILLAS PDF
-- =====================================================
-- Agregar permisos para el nuevo módulo de plantillas de reportes

-- 1. Insertar permisos para super_admin
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('super_admin', 'plantillas_pdf', 'create', true),
  ('super_admin', 'plantillas_pdf', 'read', true),
  ('super_admin', 'plantillas_pdf', 'update', true),
  ('super_admin', 'plantillas_pdf', 'delete', true)
ON CONFLICT (role, module, action) 
DO UPDATE SET allowed = EXCLUDED.allowed;

-- 2. Insertar permisos para admin
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('admin', 'plantillas_pdf', 'create', true),
  ('admin', 'plantillas_pdf', 'read', true),
  ('admin', 'plantillas_pdf', 'update', true),
  ('admin', 'plantillas_pdf', 'delete', true)
ON CONFLICT (role, module, action) 
DO UPDATE SET allowed = EXCLUDED.allowed;

-- 3. Insertar permisos para gerente (solo lectura)
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('gerente', 'plantillas_pdf', 'create', false),
  ('gerente', 'plantillas_pdf', 'read', true),
  ('gerente', 'plantillas_pdf', 'update', false),
  ('gerente', 'plantillas_pdf', 'delete', false)
ON CONFLICT (role, module, action) 
DO UPDATE SET allowed = EXCLUDED.allowed;

-- 4. Insertar permisos para supervisor (sin acceso)
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('supervisor', 'plantillas_pdf', 'create', false),
  ('supervisor', 'plantillas_pdf', 'read', false),
  ('supervisor', 'plantillas_pdf', 'update', false),
  ('supervisor', 'plantillas_pdf', 'delete', false)
ON CONFLICT (role, module, action) 
DO UPDATE SET allowed = EXCLUDED.allowed;

-- 5. Insertar permisos para residente (sin acceso)
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('residente', 'plantillas_pdf', 'create', false),
  ('residente', 'plantillas_pdf', 'read', false),
  ('residente', 'plantillas_pdf', 'update', false),
  ('residente', 'plantillas_pdf', 'delete', false)
ON CONFLICT (role, module, action) 
DO UPDATE SET allowed = EXCLUDED.allowed;

-- 6. Insertar permisos para cliente (sin acceso)
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('cliente', 'plantillas_pdf', 'create', false),
  ('cliente', 'plantillas_pdf', 'read', false),
  ('cliente', 'plantillas_pdf', 'update', false),
  ('cliente', 'plantillas_pdf', 'delete', false)
ON CONFLICT (role, module, action) 
DO UPDATE SET allowed = EXCLUDED.allowed;

-- 7. Verificar permisos creados
SELECT 
  role,
  module,
  action,
  allowed
FROM role_permissions
WHERE module = 'plantillas_pdf'
ORDER BY 
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'gerente' THEN 3
    WHEN 'supervisor' THEN 4
    WHEN 'residente' THEN 5
    WHEN 'cliente' THEN 6
  END,
  action;

-- Comentarios
COMMENT ON TABLE role_permissions IS 'Permisos granulares por rol - incluye módulo plantillas_pdf';
