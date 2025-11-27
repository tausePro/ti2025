-- =====================================================
-- MIGRACIÓN 076: Actualizar clone_template_to_project con report_type y template_key
-- =====================================================

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

  -- Definir key estable dentro del proyecto (si la global ya tiene key usarla, si no derivar de template_type)
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
    v_template.template_name,
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
      v_section.content_template,
      v_section.use_ai,
      v_section.data_sources,
      true
    );
  END LOOP;
  
  RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
