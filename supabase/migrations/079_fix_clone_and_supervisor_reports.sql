-- =====================================================
-- MIGRACIÓN 079: Corregir clonación de secciones y vista de supervisor
-- =====================================================

-- 1. Corregir función clone_template_to_project para usar base_content correctamente
CREATE OR REPLACE FUNCTION clone_template_to_project(
  p_template_id UUID,
  p_project_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_new_template_id UUID;
  v_section RECORD;
  v_template RECORD;
  v_template_key TEXT;
BEGIN
  -- Obtener plantilla global
  SELECT * INTO v_template
  FROM report_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plantilla no encontrada';
  END IF;

  -- Definir key estable dentro del proyecto
  v_template_key := COALESCE(v_template.template_key, v_template.template_type, 'custom_template');
  
  -- Crear plantilla de proyecto enlazada a la global
  INSERT INTO project_report_templates (
    project_id,
    template_name,
    description,
    header_config,
    footer_config,
    is_active,
    is_default,
    created_by,
    base_template_id,
    template_key,
    report_type
  ) VALUES (
    p_project_id,
    v_template.template_name || ' (Proyecto)',
    COALESCE(v_template.description, 'Plantilla asociada al proyecto'),
    v_template.header_config,
    v_template.footer_config,
    true,
    true,
    p_user_id,
    v_template.id,
    v_template_key,
    v_template.template_type
  )
  RETURNING id INTO v_new_template_id;
  
  -- Clonar secciones desde la plantilla global a la plantilla de proyecto
  -- CORREGIDO: Usar base_content en lugar de content_template
  FOR v_section IN 
    SELECT * FROM section_templates 
    WHERE report_template_id = p_template_id AND is_active = true
  LOOP
    INSERT INTO section_templates (
      project_template_id,
      section_key,
      section_name,
      section_order,
      content_template,
      base_content,
      use_ai,
      data_sources,
      is_active
    ) VALUES (
      v_new_template_id,
      v_section.section_key,
      v_section.section_name,
      v_section.section_order,
      v_section.content_template,
      COALESCE(v_section.base_content, v_section.content_template, ''),
      COALESCE(v_section.use_ai, false),
      v_section.data_sources,
      true
    );
  END LOOP;
  
  RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear vista para unificar informes (reports + biweekly_reports)
-- Esto permite que el supervisor vea todos los informes pendientes
CREATE OR REPLACE VIEW all_pending_reports AS
SELECT 
  id,
  project_id,
  COALESCE(short_title, 'Informe Quincenal') as title,
  'biweekly' as type,
  period_start,
  period_end,
  status,
  created_at,
  created_by,
  NULL::text as correction_notes,
  NULL::text as rejection_reason
FROM biweekly_reports
WHERE status IN ('pending_review', 'rejected')

UNION ALL

SELECT 
  id,
  project_id,
  title,
  type,
  period_start,
  period_end,
  status,
  created_at,
  created_by,
  correction_notes,
  rejection_reason
FROM reports
WHERE status IN ('pending_review', 'corrections');

-- 3. Comentarios
COMMENT ON FUNCTION clone_template_to_project IS 'Clona una plantilla global a un proyecto específico, incluyendo todas sus secciones con base_content';
COMMENT ON VIEW all_pending_reports IS 'Vista unificada de todos los informes pendientes de revisión';
