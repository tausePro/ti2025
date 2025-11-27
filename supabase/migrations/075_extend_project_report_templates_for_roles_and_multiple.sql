-- =====================================================
-- MIGRACIÓN 075: Múltiples plantillas por proyecto y visibilidad por rol
-- =====================================================

-- 1. Extender project_report_templates para soportar múltiples plantillas por proyecto
--    y controlar quién puede usarlas.

ALTER TABLE project_report_templates
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS report_type TEXT,
  ADD COLUMN IF NOT EXISTS visible_for_roles TEXT[] DEFAULT ARRAY['super_admin','admin','supervisor','resident']::TEXT[];

-- Comentarios:
-- - template_key: identificador estable dentro del proyecto (ej. 'informe_quincenal', 'reporte_bitacoras').
-- - report_type: tipo lógico del informe, normalmente heredado de report_templates.template_type.
-- - visible_for_roles: lista de roles que pueden ver/usar esta plantilla al generar informes.

-- 2. Asegurar índice útil para búsquedas por proyecto y tipo
CREATE INDEX IF NOT EXISTS idx_project_report_templates_project_and_type
  ON project_report_templates (project_id, report_type);
