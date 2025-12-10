-- =====================================================
-- MIGRACIÓN 080: Insertar secciones por defecto en plantillas globales
-- =====================================================
-- Las plantillas globales existentes no tienen secciones en section_templates
-- Esta migración las crea basándose en el campo 'sections' (JSON) de cada plantilla

-- Función para crear secciones desde el JSON de configuración
CREATE OR REPLACE FUNCTION create_sections_from_config()
RETURNS void AS $$
DECLARE
  v_template RECORD;
  v_section_key TEXT;
  v_section_order INT;
  v_section_labels JSONB;
BEGIN
  -- Mapeo de keys a nombres legibles
  v_section_labels := '{
    "cover_page": "Portada",
    "table_of_contents": "Tabla de Contenido",
    "project_info": "Información del Proyecto",
    "executive_summary": "Resumen Ejecutivo",
    "progress_status": "Estado de Avance de Obra",
    "technical_supervision": "Supervisión Técnica",
    "administrative_control": "Control Administrativo",
    "financial_status": "Estado Financiero",
    "quality_control": "Control de Calidad",
    "safety_compliance": "Cumplimiento de Seguridad",
    "daily_activities": "Actividades Diarias",
    "personnel_registry": "Registro de Personal",
    "weather_conditions": "Condiciones Climáticas",
    "materials_equipment": "Materiales y Equipos",
    "photos": "Registro Fotográfico",
    "observations": "Observaciones",
    "issues_incidents": "Novedades e Incidentes",
    "ai_insights": "Análisis con IA",
    "recommendations": "Recomendaciones",
    "signatures": "Firmas y Aprobaciones",
    "appendix": "Anexos"
  }'::JSONB;

  -- Iterar sobre cada plantilla global
  FOR v_template IN 
    SELECT id, template_name, sections 
    FROM report_templates 
    WHERE is_active = true
  LOOP
    -- Verificar si ya tiene secciones
    IF NOT EXISTS (
      SELECT 1 FROM section_templates 
      WHERE report_template_id = v_template.id
    ) THEN
      -- Crear secciones desde el JSON de configuración
      v_section_order := 1;
      
      FOR v_section_key IN 
        SELECT key FROM jsonb_each(COALESCE(v_template.sections, '{}'::JSONB))
        WHERE (v_template.sections->>key)::boolean = true
      LOOP
        INSERT INTO section_templates (
          report_template_id,
          section_key,
          section_name,
          section_order,
          content_template,
          base_content,
          use_ai,
          is_active
        ) VALUES (
          v_template.id,
          v_section_key,
          COALESCE(v_section_labels->>v_section_key, v_section_key),
          v_section_order,
          '<p>{{' || v_section_key || '_content}}</p>',
          '<p>Contenido de ' || COALESCE(v_section_labels->>v_section_key, v_section_key) || '</p>',
          true,
          true
        );
        
        v_section_order := v_section_order + 1;
      END LOOP;
      
      RAISE NOTICE 'Creadas % secciones para plantilla: %', v_section_order - 1, v_template.template_name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función
SELECT create_sections_from_config();

-- Eliminar la función temporal
DROP FUNCTION IF EXISTS create_sections_from_config();

-- También insertar secciones por defecto si no hay ninguna plantilla global
-- Crear una plantilla global por defecto si no existe
DO $$
DECLARE
  v_template_id UUID;
  v_section_order INT := 1;
BEGIN
  -- Verificar si existe alguna plantilla global activa
  IF NOT EXISTS (SELECT 1 FROM report_templates WHERE is_active = true) THEN
    -- Crear plantilla por defecto
    INSERT INTO report_templates (
      template_name,
      template_type,
      description,
      is_default,
      is_active,
      sections
    ) VALUES (
      'Informe Quincenal de Interventoría',
      'interventoria_administrativa',
      'Plantilla estándar para informes quincenales de interventoría',
      true,
      true,
      '{
        "cover_page": true,
        "table_of_contents": true,
        "project_info": true,
        "executive_summary": true,
        "progress_status": true,
        "technical_supervision": true,
        "quality_control": true,
        "daily_activities": true,
        "photos": true,
        "observations": true,
        "recommendations": true,
        "signatures": true
      }'::JSONB
    )
    RETURNING id INTO v_template_id;
    
    -- Crear secciones para esta plantilla
    INSERT INTO section_templates (report_template_id, section_key, section_name, section_order, base_content, use_ai, is_active)
    VALUES
      (v_template_id, 'cover_page', 'Portada', 1, '<h1>{{project_name}}</h1><p>Período: {{period_start}} - {{period_end}}</p>', true, true),
      (v_template_id, 'table_of_contents', 'Tabla de Contenido', 2, '<p>Tabla de contenido generada automáticamente</p>', false, true),
      (v_template_id, 'project_info', 'Información del Proyecto', 3, '<h2>Información del Proyecto</h2><p><strong>Proyecto:</strong> {{project_name}}</p><p><strong>Código:</strong> {{project_code}}</p><p><strong>Dirección:</strong> {{project_address}}</p>', true, true),
      (v_template_id, 'executive_summary', 'Resumen Ejecutivo', 4, '<h2>Resumen Ejecutivo</h2><p>Durante el período {{period_start}} al {{period_end}}, se registraron {{summary.work_days}} días laborales con las siguientes actividades principales:</p>', true, true),
      (v_template_id, 'progress_status', 'Estado de Avance', 5, '<h2>Estado de Avance de Obra</h2><p>{{daily_logs_html}}</p>', true, true),
      (v_template_id, 'technical_supervision', 'Supervisión Técnica', 6, '<h2>Supervisión Técnica</h2><p>Se realizaron las siguientes actividades de supervisión técnica durante el período.</p>', true, true),
      (v_template_id, 'quality_control', 'Control de Calidad', 7, '<h2>Control de Calidad</h2><p>{{quality_control_html}}</p>', true, true),
      (v_template_id, 'daily_activities', 'Actividades Diarias', 8, '<h2>Actividades Diarias</h2><p>{{daily_logs_html}}</p>', true, true),
      (v_template_id, 'photos', 'Registro Fotográfico', 9, '<h2>Registro Fotográfico</h2><p>{{photos_html}}</p>', true, true),
      (v_template_id, 'observations', 'Observaciones', 10, '<h2>Observaciones</h2><p>Se presentan las siguientes observaciones del período.</p>', true, true),
      (v_template_id, 'recommendations', 'Recomendaciones', 11, '<h2>Recomendaciones</h2><p>Se recomienda continuar con el seguimiento de las actividades programadas.</p>', true, true),
      (v_template_id, 'signatures', 'Firmas y Aprobaciones', 12, '<h2>Firmas</h2><p>Elaborado por: {{resident_name}}</p><p>Revisado por: {{supervisor_name}}</p>', true, true);
    
    RAISE NOTICE 'Creada plantilla global por defecto con 12 secciones';
  END IF;
END $$;

-- Verificar resultado
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM section_templates WHERE report_template_id IS NOT NULL;
  RAISE NOTICE 'Total de secciones en plantillas globales: %', v_count;
END $$;
