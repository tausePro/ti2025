-- =====================================================
-- MIGRACIÓN 064: PERMISOS PARA CONTROL DE CALIDAD
-- =====================================================

-- 1. Agregar permisos para el módulo 'control_calidad'
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  -- Super Admin: todos los permisos
  ('super_admin', 'control_calidad', 'read', true),
  ('super_admin', 'control_calidad', 'create', true),
  ('super_admin', 'control_calidad', 'update', true),
  ('super_admin', 'control_calidad', 'delete', true),
  
  -- Admin: todos los permisos
  ('admin', 'control_calidad', 'read', true),
  ('admin', 'control_calidad', 'create', true),
  ('admin', 'control_calidad', 'update', true),
  ('admin', 'control_calidad', 'delete', true),
  
  -- Gerente: todos los permisos
  ('gerente', 'control_calidad', 'read', true),
  ('gerente', 'control_calidad', 'create', true),
  ('gerente', 'control_calidad', 'update', true),
  ('gerente', 'control_calidad', 'delete', false),
  
  -- Supervisor: puede ver, crear y actualizar
  ('supervisor', 'control_calidad', 'read', true),
  ('supervisor', 'control_calidad', 'create', true),
  ('supervisor', 'control_calidad', 'update', true),
  ('supervisor', 'control_calidad', 'delete', false),
  
  -- Residente: puede ver, crear y actualizar
  ('residente', 'control_calidad', 'read', true),
  ('residente', 'control_calidad', 'create', true),
  ('residente', 'control_calidad', 'update', true),
  ('residente', 'control_calidad', 'delete', false),
  
  -- Cliente: solo puede ver
  ('cliente', 'control_calidad', 'read', true),
  ('cliente', 'control_calidad', 'create', false),
  ('cliente', 'control_calidad', 'update', false),
  ('cliente', 'control_calidad', 'delete', false)
ON CONFLICT (role, module, action) DO UPDATE
SET allowed = EXCLUDED.allowed;

-- 2. Permisos para gestión de templates (solo admin)
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('super_admin', 'control_calidad_templates', 'read', true),
  ('super_admin', 'control_calidad_templates', 'create', true),
  ('super_admin', 'control_calidad_templates', 'update', true),
  ('super_admin', 'control_calidad_templates', 'delete', true),
  
  ('admin', 'control_calidad_templates', 'read', true),
  ('admin', 'control_calidad_templates', 'create', true),
  ('admin', 'control_calidad_templates', 'update', true),
  ('admin', 'control_calidad_templates', 'delete', true),
  
  ('gerente', 'control_calidad_templates', 'read', true),
  ('gerente', 'control_calidad_templates', 'create', false),
  ('gerente', 'control_calidad_templates', 'update', false),
  ('gerente', 'control_calidad_templates', 'delete', false),
  
  ('supervisor', 'control_calidad_templates', 'read', true),
  ('supervisor', 'control_calidad_templates', 'create', false),
  ('supervisor', 'control_calidad_templates', 'update', false),
  ('supervisor', 'control_calidad_templates', 'delete', false),
  
  ('residente', 'control_calidad_templates', 'read', true),
  ('residente', 'control_calidad_templates', 'create', false),
  ('residente', 'control_calidad_templates', 'update', false),
  ('residente', 'control_calidad_templates', 'delete', false),
  
  ('cliente', 'control_calidad_templates', 'read', true),
  ('cliente', 'control_calidad_templates', 'create', false),
  ('cliente', 'control_calidad_templates', 'update', false),
  ('cliente', 'control_calidad_templates', 'delete', false)
ON CONFLICT (role, module, action) DO UPDATE
SET allowed = EXCLUDED.allowed;

-- 3. Verificar permisos creados
SELECT 
  role,
  module,
  action,
  allowed
FROM role_permissions
WHERE module IN ('control_calidad', 'control_calidad_templates')
ORDER BY 
  module,
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'gerente' THEN 3
    WHEN 'supervisor' THEN 4
    WHEN 'residente' THEN 5
    WHEN 'cliente' THEN 6
  END,
  CASE action
    WHEN 'read' THEN 1
    WHEN 'create' THEN 2
    WHEN 'update' THEN 3
    WHEN 'delete' THEN 4
  END;
