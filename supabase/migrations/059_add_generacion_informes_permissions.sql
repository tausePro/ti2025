-- =====================================================
-- MIGRACIÓN 059: PERMISOS PARA GENERACIÓN DE INFORMES
-- =====================================================

-- 1. Agregar permisos para el módulo 'generacion_informes'
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  -- Super Admin: todos los permisos
  ('super_admin', 'generacion_informes', 'read', true),
  ('super_admin', 'generacion_informes', 'create', true),
  ('super_admin', 'generacion_informes', 'update', true),
  ('super_admin', 'generacion_informes', 'delete', true),
  
  -- Admin: todos los permisos
  ('admin', 'generacion_informes', 'read', true),
  ('admin', 'generacion_informes', 'create', true),
  ('admin', 'generacion_informes', 'update', true),
  ('admin', 'generacion_informes', 'delete', true),
  
  -- Gerente: puede ver y generar
  ('gerente', 'generacion_informes', 'read', true),
  ('gerente', 'generacion_informes', 'create', true),
  ('gerente', 'generacion_informes', 'update', false),
  ('gerente', 'generacion_informes', 'delete', false),
  
  -- Supervisor: puede ver y generar
  ('supervisor', 'generacion_informes', 'read', true),
  ('supervisor', 'generacion_informes', 'create', true),
  ('supervisor', 'generacion_informes', 'update', false),
  ('supervisor', 'generacion_informes', 'delete', false),
  
  -- Residente: solo puede ver
  ('residente', 'generacion_informes', 'read', true),
  ('residente', 'generacion_informes', 'create', false),
  ('residente', 'generacion_informes', 'update', false),
  ('residente', 'generacion_informes', 'delete', false),
  
  -- Cliente: solo puede ver
  ('cliente', 'generacion_informes', 'read', true),
  ('cliente', 'generacion_informes', 'create', false),
  ('cliente', 'generacion_informes', 'update', false),
  ('cliente', 'generacion_informes', 'delete', false)
ON CONFLICT (role, module, action) DO UPDATE
SET allowed = EXCLUDED.allowed;

-- 2. Verificar permisos creados
SELECT 
  role,
  action,
  allowed
FROM role_permissions
WHERE module = 'generacion_informes'
ORDER BY 
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

-- Comentario
COMMENT ON TABLE role_permissions IS 'Permisos granulares por rol - Incluye módulos: plantillas_pdf, generacion_informes';
