-- =====================================================
-- MIGRACIÓN 073: Funciones faltantes para informes
-- =====================================================

-- Función para recopilar datos del período
CREATE OR REPLACE FUNCTION collect_report_data(
  p_project_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS JSONB AS $$
DECLARE
  v_data JSONB;
  v_project JSONB;
  v_daily_logs JSONB;
  v_quality_samples JSONB;
  v_photos JSONB;
BEGIN
  -- Información del proyecto
  SELECT to_jsonb(p.*) INTO v_project
  FROM projects p
  WHERE p.id = p_project_id;
  
  -- Bitácoras del período
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', dl.id,
      'date', dl.date,
      'activities', dl.activities,
      'weather', dl.weather,
      'personnel_count', dl.personnel_count,
      'observations', dl.observations,
      'photos', dl.photos,
      'created_by', prof.full_name
    )
  ) INTO v_daily_logs
  FROM daily_logs dl
  LEFT JOIN profiles prof ON prof.id = dl.created_by
  WHERE dl.project_id = p_project_id
    AND dl.date BETWEEN p_period_start AND p_period_end
  ORDER BY dl.date;
  
  -- Muestras de calidad del período
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', qs.id,
      'sample_number', qs.sample_number,
      'sample_date', qs.sample_date,
      'location', qs.location,
      'status', qs.status,
      'overall_result', qs.overall_result,
      'template_name', qt.template_name,
      'tests_count', (
        SELECT COUNT(*) FROM quality_control_tests qct WHERE qct.sample_id = qs.id
      )
    )
  ) INTO v_quality_samples
  FROM quality_control_samples qs
  LEFT JOIN quality_control_templates qt ON qt.id = qs.template_id
  WHERE qs.project_id = p_project_id
    AND qs.sample_date BETWEEN p_period_start AND p_period_end;
  
  -- Recopilar todas las fotos del período
  SELECT jsonb_agg(DISTINCT photo) INTO v_photos
  FROM daily_logs dl,
       LATERAL unnest(dl.photos) AS photo
  WHERE dl.project_id = p_project_id
    AND dl.date BETWEEN p_period_start AND p_period_end
    AND dl.photos IS NOT NULL;
  
  -- Construir objeto de datos
  v_data := jsonb_build_object(
    'project_info', v_project,
    'daily_logs', COALESCE(v_daily_logs, '[]'::jsonb),
    'quality_samples', COALESCE(v_quality_samples, '[]'::jsonb),
    'photos', COALESCE(v_photos, '[]'::jsonb),
    'period', jsonb_build_object(
      'start', p_period_start,
      'end', p_period_end
    )
  );
  
  RETURN v_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar número de informe
CREATE OR REPLACE FUNCTION generate_report_number(
  p_project_id UUID,
  p_period_start DATE
)
RETURNS VARCHAR AS $$
DECLARE
  v_project_code VARCHAR;
  v_year VARCHAR;
  v_quinzena VARCHAR;
  v_report_number VARCHAR;
BEGIN
  -- Obtener código del proyecto
  SELECT COALESCE(project_code, 'PROJ') INTO v_project_code
  FROM projects
  WHERE id = p_project_id;
  
  -- Año
  v_year := EXTRACT(YEAR FROM p_period_start)::VARCHAR;
  
  -- Quinzena (1-24, cada 15 días aproximadamente)
  v_quinzena := LPAD(
    (EXTRACT(DOY FROM p_period_start)::INTEGER / 15 + 1)::VARCHAR,
    2, '0'
  );
  
  -- Formato: PROJ-2025-Q01
  v_report_number := v_project_code || '-' || v_year || '-Q' || v_quinzena;
  
  RETURN v_report_number;
END;
$$ LANGUAGE plpgsql;

-- Permisos para ejecutar las funciones
GRANT EXECUTE ON FUNCTION collect_report_data TO authenticated;
GRANT EXECUTE ON FUNCTION generate_report_number TO authenticated;

-- Comentarios
COMMENT ON FUNCTION collect_report_data IS 'Recopila todos los datos del período para generar el informe';
COMMENT ON FUNCTION generate_report_number IS 'Genera número de informe automático: PROJ-2025-Q01';
