-- =====================================================
-- MIGRACIÓN 101: FIX CONTEO DE ENSAYOS EN INFORME QUINCENAL
-- =====================================================
-- La función collect_report_data (077) contaba overall_result =
-- 'aprobado'/'rechazado', pero el trigger de calidad escribe
-- 'CUMPLE'/'NO CUMPLE'/'SIN EVALUAR' (migraciones 094/096), por lo que
-- passed_tests y failed_tests siempre daban 0.
-- Se aceptan ambos juegos de valores por si existen muestras antiguas.

CREATE OR REPLACE FUNCTION collect_report_data(
  p_project_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_daily_logs JSONB;
  v_quality_samples JSONB;
  v_photos JSONB;
  v_summary JSONB;
BEGIN
  -- Bitácoras del período
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'log_date', log_date,
      'activities_summary', activities_summary,
      'workers_count', workers_count,
      'weather_condition', weather_condition
    )
  ), '[]'::jsonb) INTO v_daily_logs
  FROM daily_logs
  WHERE project_id = p_project_id
    AND log_date >= p_period_start
    AND log_date <= p_period_end;

  -- Muestras de control de calidad
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'sample_code', sample_code,
      'sample_date', sample_date,
      'location', location,
      'overall_result', overall_result
    )
  ), '[]'::jsonb) INTO v_quality_samples
  FROM quality_control_samples
  WHERE project_id = p_project_id
    AND sample_date >= p_period_start
    AND sample_date <= p_period_end;

  -- Fotos del período
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'file_url', file_url,
      'file_name', file_name,
      'description', description
    )
  ), '[]'::jsonb) INTO v_photos
  FROM project_documents
  WHERE project_id = p_project_id
    AND file_type = 'photo'
    AND uploaded_at >= p_period_start
    AND uploaded_at <= p_period_end + INTERVAL '1 day';

  -- Resumen estadístico
  SELECT jsonb_build_object(
    'total_days', (SELECT COUNT(*) FROM daily_logs WHERE project_id = p_project_id AND log_date >= p_period_start AND log_date <= p_period_end),
    'work_days', (SELECT COUNT(*) FROM daily_logs WHERE project_id = p_project_id AND log_date >= p_period_start AND log_date <= p_period_end AND weather_condition != 'lluvia_intensa'),
    'total_workers', (SELECT COALESCE(SUM(workers_count), 0) FROM daily_logs WHERE project_id = p_project_id AND log_date >= p_period_start AND log_date <= p_period_end),
    'total_tests', (SELECT COUNT(*) FROM quality_control_samples WHERE project_id = p_project_id AND sample_date >= p_period_start AND sample_date <= p_period_end),
    'passed_tests', (SELECT COUNT(*) FROM quality_control_samples WHERE project_id = p_project_id AND sample_date >= p_period_start AND sample_date <= p_period_end AND overall_result IN ('CUMPLE', 'aprobado')),
    'failed_tests', (SELECT COUNT(*) FROM quality_control_samples WHERE project_id = p_project_id AND sample_date >= p_period_start AND sample_date <= p_period_end AND overall_result IN ('NO CUMPLE', 'rechazado')),
    'total_photos', (SELECT COUNT(*) FROM project_documents WHERE project_id = p_project_id AND file_type = 'photo' AND uploaded_at >= p_period_start AND uploaded_at <= p_period_end + INTERVAL '1 day')
  ) INTO v_summary;

  -- Construir resultado final
  v_result := jsonb_build_object(
    'daily_logs', v_daily_logs,
    'quality_samples', v_quality_samples,
    'photos', v_photos,
    'summary', v_summary,
    'collected_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Verificación: valores actuales de overall_result en la base
SELECT overall_result, COUNT(*)
FROM quality_control_samples
GROUP BY overall_result
ORDER BY overall_result;
