-- =====================================================
-- MIGRACIÓN 078: Corregir contenido de secciones de plantillas
-- =====================================================
-- Actualiza las secciones con contenido base real que incluye placeholders

-- 1. Actualizar secciones de la plantilla global "Informe Quincenal de Interventoría"
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Obtener ID de la plantilla
  SELECT id INTO v_template_id
  FROM report_templates
  WHERE template_name = 'Informe Quincenal de Interventoría'
    AND company_id IS NULL
  LIMIT 1;
  
  IF v_template_id IS NULL THEN
    RAISE NOTICE 'Plantilla no encontrada, creándola...';
    
    INSERT INTO report_templates (
      company_id,
      template_name,
      template_type,
      header_config,
      footer_config,
      is_default,
      is_active
    ) VALUES (
      NULL,
      'Informe Quincenal de Interventoría',
      'interventoria',
      jsonb_build_object(
        'logo_url', '',
        'company_name', 'TALENTO INMOBILIARIO',
        'show_project_code', true,
        'show_date', true
      ),
      jsonb_build_object(
        'show_page_numbers', true,
        'include_signatures', true
      ),
      true,
      true
    )
    RETURNING id INTO v_template_id;
  END IF;
  
  -- Eliminar secciones existentes para recrearlas con contenido correcto
  DELETE FROM section_templates WHERE report_template_id = v_template_id;
  
  -- Insertar secciones con contenido base real
  INSERT INTO section_templates (
    report_template_id, 
    section_key, 
    section_name, 
    section_order, 
    content_template,
    base_content,
    use_ai, 
    data_sources,
    is_active
  ) VALUES
  
  -- Sección 1: Información General
  (v_template_id, 'informacion_general', 'INFORMACIÓN GENERAL', 1, 
   'Información general del proyecto y período del informe.',
   '<h2>1. INFORMACIÓN GENERAL</h2>
<table style="width: 100%; border-collapse: collapse;">
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px; width: 30%;"><strong>Proyecto:</strong></td>
    <td style="border: 1px solid #ccc; padding: 8px;">{{project_name}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px;"><strong>Código:</strong></td>
    <td style="border: 1px solid #ccc; padding: 8px;">{{project_code}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px;"><strong>Período:</strong></td>
    <td style="border: 1px solid #ccc; padding: 8px;">{{period_start}} al {{period_end}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px;"><strong>Ubicación:</strong></td>
    <td style="border: 1px solid #ccc; padding: 8px;">{{project_address}}</td>
  </tr>
</table>',
   false, '["project_info"]'::jsonb, true),
  
  -- Sección 2: Objetivo del Informe
  (v_template_id, 'objetivo', 'OBJETIVO DEL INFORME', 2,
   'Objetivo del informe quincenal.',
   '<h2>2. OBJETIVO DEL INFORME</h2>
<p>El presente informe tiene como objetivo presentar el avance de las actividades de interventoría y supervisión técnica independiente realizadas durante el período comprendido entre el <strong>{{period_start}}</strong> y el <strong>{{period_end}}</strong> en el proyecto <strong>{{project_name}}</strong>.</p>
<p>Se incluye el seguimiento a las actividades constructivas, control de calidad de materiales, verificación del cumplimiento de especificaciones técnicas y registro fotográfico del avance de obra.</p>',
   false, '["project_info"]'::jsonb, true),
  
  -- Sección 3: Resumen Ejecutivo
  (v_template_id, 'resumen_ejecutivo', 'RESUMEN EJECUTIVO', 3,
   'Resumen de actividades del período.',
   '<h2>3. RESUMEN EJECUTIVO</h2>
<p>Durante el período reportado se registraron las siguientes estadísticas:</p>
<ul>
  <li><strong>Días de trabajo:</strong> {{summary.work_days}} días</li>
  <li><strong>Días con lluvia:</strong> {{summary.rain_days}} días</li>
  <li><strong>Personal total:</strong> {{summary.total_workers}} trabajadores</li>
  <li><strong>Ensayos realizados:</strong> {{summary.total_tests}}</li>
  <li><strong>Ensayos aprobados:</strong> {{summary.passed_tests}}</li>
  <li><strong>Ensayos rechazados:</strong> {{summary.failed_tests}}</li>
</ul>',
   false, '["daily_logs", "quality_samples"]'::jsonb, true),
  
  -- Sección 4: Actividades Técnicas
  (v_template_id, 'actividades_tecnicas', 'ACTIVIDADES TÉCNICAS EJECUTADAS', 4,
   'Detalle de actividades técnicas del período.',
   '<h2>4. ACTIVIDADES TÉCNICAS EJECUTADAS</h2>
<p>A continuación se presenta el registro de actividades técnicas ejecutadas durante el período:</p>
{{bitacora.actividades}}',
   false, '["daily_logs"]'::jsonb, true),
  
  -- Sección 5: Control de Calidad
  (v_template_id, 'control_calidad', 'CONTROL DE CALIDAD', 5,
   'Ensayos y resultados de control de calidad.',
   '<h2>5. CONTROL DE CALIDAD</h2>
<p>Se realizaron los siguientes ensayos de control de calidad durante el período:</p>
{{qc.ensayos}}
<h3>5.1 Resumen de Resultados</h3>
<p>{{qc.resultados}}</p>',
   false, '["quality_samples"]'::jsonb, true),
  
  -- Sección 6: Registro Fotográfico
  (v_template_id, 'registro_fotografico', 'REGISTRO FOTOGRÁFICO', 6,
   'Fotos del avance de obra.',
   '<h2>6. REGISTRO FOTOGRÁFICO</h2>
<p>A continuación se presenta el registro fotográfico del avance de obra durante el período:</p>
{{fotos}}',
   false, '["photos"]'::jsonb, true),
  
  -- Sección 7: Conclusiones
  (v_template_id, 'conclusiones', 'CONCLUSIONES Y RECOMENDACIONES', 7,
   'Conclusiones y recomendaciones.',
   '<h2>7. CONCLUSIONES Y RECOMENDACIONES</h2>
<h3>7.1 Conclusiones</h3>
<ul>
  <li>Durante el período se ejecutaron las actividades programadas de acuerdo al cronograma de obra.</li>
  <li>Los ensayos de control de calidad muestran un cumplimiento del {{qc.porcentaje_aprobados}}% de las especificaciones técnicas.</li>
  <li>Se mantiene el registro fotográfico actualizado del avance de obra.</li>
</ul>
<h3>7.2 Recomendaciones</h3>
<ul>
  <li>Continuar con el seguimiento a las actividades constructivas según el cronograma establecido.</li>
  <li>Mantener el control de calidad de materiales y procesos constructivos.</li>
  <li>Documentar cualquier novedad o cambio en el alcance del proyecto.</li>
</ul>',
   false, '["daily_logs", "quality_samples"]'::jsonb, true);
  
  RAISE NOTICE 'Secciones actualizadas para plantilla ID: %', v_template_id;
END $$;

-- 2. Asegurar que section_templates tenga la columna base_content
ALTER TABLE section_templates 
  ADD COLUMN IF NOT EXISTS base_content TEXT;

-- 3. Actualizar secciones existentes que no tengan base_content
UPDATE section_templates 
SET base_content = content_template 
WHERE base_content IS NULL AND content_template IS NOT NULL;

-- 4. Comentarios
COMMENT ON COLUMN section_templates.content_template IS 'Plantilla de contenido con instrucciones para IA';
COMMENT ON COLUMN section_templates.base_content IS 'Contenido base con placeholders para generación automática';
