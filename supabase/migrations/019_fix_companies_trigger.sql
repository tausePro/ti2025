-- =====================================================
-- MIGRACIÓN 019: ARREGLAR TRIGGER DE COMPANIES
-- =====================================================

-- El trigger update_performance_metrics falla porque intenta acceder
-- a campos que no existen en la tabla companies (created_by)

-- Recrear la función del trigger con manejo correcto de campos
CREATE OR REPLACE FUNCTION update_performance_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
BEGIN
  -- Determinar company_id según la tabla
  v_company_id := CASE
    WHEN TG_TABLE_NAME = 'projects' AND NEW.client_company_id IS NOT NULL THEN NEW.client_company_id
    WHEN TG_TABLE_NAME = 'companies' THEN NEW.id
    ELSE NULL
  END;

  -- Determinar user_id según la tabla y campos disponibles
  v_user_id := CASE
    WHEN TG_TABLE_NAME = 'projects' THEN 
      CASE WHEN TG_OP = 'INSERT' THEN NEW.created_by ELSE NULL END
    WHEN TG_TABLE_NAME = 'companies' THEN 
      -- Companies no tiene created_by, usar el usuario actual de la sesión
      auth.uid()
    ELSE NULL
  END;

  -- Insertar métrica de actividad
  INSERT INTO performance_metrics (
    metric_type,
    metric_name,
    value,
    company_id,
    user_id,
    metadata
  ) VALUES (
    'feature_usage',
    TG_TABLE_NAME || '_' || TG_OP,
    1,
    v_company_id,
    v_user_id,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', NEW.id::text
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla la métrica, no bloquear la operación principal
    RAISE WARNING 'Error en update_performance_metrics: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_performance_metrics() IS 'Trigger para registrar métricas de uso - no bloquea operaciones si falla';
