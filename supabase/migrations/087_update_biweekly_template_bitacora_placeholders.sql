DO $migration$
DECLARE
  v_template_id UUID;
  v_old_resumen_instruction TEXT := 'Resumen de actividades del período.';
  v_old_actividades_instruction TEXT := 'Detalle de actividades técnicas del período.';
  v_old_resumen TEXT := $old_resumen$
<h2>3. RESUMEN EJECUTIVO</h2>
<p>Durante el período reportado se registraron las siguientes estadísticas:</p>
<ul>
  <li><strong>Días de trabajo:</strong> {{summary.work_days}} días</li>
  <li><strong>Días con lluvia:</strong> {{summary.rain_days}} días</li>
  <li><strong>Personal total:</strong> {{summary.total_workers}} trabajadores</li>
  <li><strong>Ensayos realizados:</strong> {{summary.total_tests}}</li>
  <li><strong>Ensayos aprobados:</strong> {{summary.passed_tests}}</li>
  <li><strong>Ensayos rechazados:</strong> {{summary.failed_tests}}</li>
</ul>$old_resumen$;
  v_new_resumen TEXT := $new_resumen$
<h2>3. RESUMEN EJECUTIVO</h2>
<p>Durante el período reportado se registraron las siguientes estadísticas operativas y de control:</p>
<ul>
  <li><strong>Días de trabajo:</strong> {{summary.work_days}} días</li>
  <li><strong>Días con lluvia:</strong> {{summary.rain_days}} días</li>
  <li><strong>Personal acumulado registrado:</strong> {{summary.total_workers}} trabajadores</li>
  <li><strong>Promedio de personal por registro:</strong> {{bitacora.personal}}</li>
  <li><strong>Ensayos realizados:</strong> {{summary.total_tests}}</li>
  <li><strong>Ensayos aprobados:</strong> {{summary.passed_tests}}</li>
  <li><strong>Ensayos rechazados:</strong> {{summary.failed_tests}}</li>
</ul>
<h3>3.1 Síntesis de actividades</h3>
<p>{{bitacora.resumen}}</p>
<h3>3.2 Resumen de checklist de bitácora</h3>
{{bitacora.checklist_resumen}}$new_resumen$;
  v_old_actividades TEXT := $old_actividades$
<h2>4. ACTIVIDADES TÉCNICAS EJECUTADAS</h2>
<p>A continuación se presenta el registro de actividades técnicas ejecutadas durante el período:</p>
{{bitacora.actividades}}$old_actividades$;
  v_new_actividades TEXT := $new_actividades$
<h2>4. ACTIVIDADES TÉCNICAS EJECUTADAS</h2>
<p>A continuación se presenta el registro de actividades técnicas ejecutadas durante el período, tomando como fuente principal la bitácora diaria de obra:</p>
{{bitacora.actividades}}
<h3>4.1 Checklist de verificación registrado en bitácora</h3>
{{bitacora.checklist}}
<h3>4.2 Campos personalizados registrados en bitácora</h3>
{{bitacora.campos_personalizados}}$new_actividades$;
BEGIN
  SELECT id INTO v_template_id
  FROM report_templates
  WHERE template_name = 'Informe Quincenal de Interventoría'
    AND company_id IS NULL
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RAISE NOTICE 'No se encontró la plantilla global Informe Quincenal de Interventoría.';
    RETURN;
  END IF;

  UPDATE section_templates
  SET base_content = v_new_resumen
  WHERE report_template_id = v_template_id
    AND section_key = 'resumen_ejecutivo'
    AND COALESCE(base_content, '') IN (v_old_resumen, v_old_resumen_instruction, '');

  UPDATE section_templates
  SET base_content = v_new_actividades
  WHERE report_template_id = v_template_id
    AND section_key = 'actividades_tecnicas'
    AND COALESCE(base_content, '') IN (v_old_actividades, v_old_actividades_instruction, '');

  UPDATE section_templates st
  SET base_content = v_new_resumen
  FROM project_report_templates prt
  WHERE st.project_template_id = prt.id
    AND prt.base_template_id = v_template_id
    AND st.section_key = 'resumen_ejecutivo'
    AND COALESCE(st.base_content, '') IN (v_old_resumen, v_old_resumen_instruction, '');

  UPDATE section_templates st
  SET base_content = v_new_actividades
  FROM project_report_templates prt
  WHERE st.project_template_id = prt.id
    AND prt.base_template_id = v_template_id
    AND st.section_key = 'actividades_tecnicas'
    AND COALESCE(st.base_content, '') IN (v_old_actividades, v_old_actividades_instruction, '');
END
$migration$;
