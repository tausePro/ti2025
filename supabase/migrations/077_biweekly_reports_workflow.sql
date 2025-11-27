-- =====================================================
-- MIGRACIÓN 077: Flujo completo de Informes Quincenales
-- =====================================================
-- Ajusta estados, agrega campos de firma y notificaciones

-- 1. Agregar nuevos campos a biweekly_reports
ALTER TABLE biweekly_reports
  ADD COLUMN IF NOT EXISTS project_template_id UUID REFERENCES project_report_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_supervisor UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS supervisor_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_gerente UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS gerente_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS gerente_signed_at TIMESTAMPTZ;

-- 2. Actualizar constraint de status para incluir nuevos estados
ALTER TABLE biweekly_reports DROP CONSTRAINT IF EXISTS biweekly_reports_status_check;
ALTER TABLE biweekly_reports ADD CONSTRAINT biweekly_reports_status_check 
  CHECK (status IN ('draft', 'pending_review', 'rejected', 'approved', 'pending_signature', 'published'));

-- 3. Índices adicionales
CREATE INDEX IF NOT EXISTS idx_biweekly_reports_approved_by ON biweekly_reports(approved_by);
CREATE INDEX IF NOT EXISTS idx_biweekly_reports_project_template ON biweekly_reports(project_template_id);

-- 4. Función para generar número de informe
DROP FUNCTION IF EXISTS generate_report_number(UUID, DATE);
CREATE OR REPLACE FUNCTION generate_report_number(
  p_project_id UUID,
  p_period_start DATE
)
RETURNS TEXT AS $$
DECLARE
  v_project_code TEXT;
  v_year TEXT;
  v_month TEXT;
  v_count INTEGER;
BEGIN
  -- Obtener código del proyecto
  SELECT project_code INTO v_project_code
  FROM projects
  WHERE id = p_project_id;
  
  IF v_project_code IS NULL THEN
    v_project_code := 'PRJ';
  END IF;
  
  -- Año y mes del período
  v_year := TO_CHAR(p_period_start, 'YYYY');
  v_month := TO_CHAR(p_period_start, 'MM');
  
  -- Contar informes existentes del proyecto en el año
  SELECT COUNT(*) + 1 INTO v_count
  FROM biweekly_reports
  WHERE project_id = p_project_id
    AND EXTRACT(YEAR FROM period_start) = EXTRACT(YEAR FROM p_period_start);
  
  RETURN v_project_code || '-IQ-' || v_year || v_month || '-' || LPAD(v_count::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- 5. Función para recopilar datos del informe
DROP FUNCTION IF EXISTS collect_report_data(UUID, DATE, DATE);
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
    'passed_tests', (SELECT COUNT(*) FROM quality_control_samples WHERE project_id = p_project_id AND sample_date >= p_period_start AND sample_date <= p_period_end AND overall_result = 'aprobado'),
    'failed_tests', (SELECT COUNT(*) FROM quality_control_samples WHERE project_id = p_project_id AND sample_date >= p_period_start AND sample_date <= p_period_end AND overall_result = 'rechazado'),
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

-- 6. Trigger para notificar cuando se envía informe a revisión
CREATE OR REPLACE FUNCTION notify_biweekly_report_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_supervisor_id UUID;
  v_project_code VARCHAR;
  v_project_name VARCHAR;
BEGIN
  -- Solo ejecutar cuando cambia a 'pending_review'
  IF NEW.status = 'pending_review' AND (OLD.status IS NULL OR OLD.status != 'pending_review') THEN
    
    -- Obtener datos del proyecto
    SELECT project_code, name INTO v_project_code, v_project_name
    FROM projects
    WHERE id = NEW.project_id;
    
    -- Obtener supervisor del proyecto
    SELECT pm.user_id INTO v_supervisor_id
    FROM project_members pm
    JOIN profiles pr ON pr.id = pm.user_id
    WHERE pm.project_id = NEW.project_id
      AND pm.is_active = TRUE
      AND pr.role = 'supervisor'
    LIMIT 1;
    
    -- Crear notificación para el supervisor
    IF v_supervisor_id IS NOT NULL THEN
      PERFORM create_notification(
        v_supervisor_id,
        'biweekly_report_submitted',
        'Informe quincenal enviado para revisión',
        'El residente ha enviado el informe ' || NEW.report_number || ' del proyecto ' || v_project_name || ' para tu revisión.',
        'biweekly_report',
        NEW.id,
        NEW.project_id,
        'high',
        jsonb_build_object(
          'report_id', NEW.id,
          'report_number', NEW.report_number,
          'submitted_by', NEW.submitted_by,
          'period_start', NEW.period_start,
          'period_end', NEW.period_end
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_biweekly_submission ON biweekly_reports;
CREATE TRIGGER trigger_notify_biweekly_submission
  AFTER INSERT OR UPDATE ON biweekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_biweekly_report_submission();

-- 7. Trigger para notificar aprobación/rechazo y firma de gerente
CREATE OR REPLACE FUNCTION notify_biweekly_report_review()
RETURNS TRIGGER AS $$
DECLARE
  v_gerente_id UUID;
  v_project_name VARCHAR;
BEGIN
  -- Obtener nombre del proyecto
  SELECT name INTO v_project_name
  FROM projects
  WHERE id = NEW.project_id;

  -- Notificar rechazo al residente
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    IF NEW.created_by IS NOT NULL THEN
      PERFORM create_notification(
        NEW.created_by,
        'biweekly_report_rejected',
        'Informe quincenal rechazado',
        'Tu informe ' || NEW.report_number || ' ha sido rechazado. Motivo: ' || COALESCE(NEW.rejection_reason, 'No especificado'),
        'biweekly_report',
        NEW.id,
        NEW.project_id,
        'high',
        jsonb_build_object(
          'report_id', NEW.id,
          'report_number', NEW.report_number,
          'rejection_reason', NEW.rejection_reason,
          'reviewed_by', NEW.reviewed_by
        )
      );
    END IF;
  END IF;
  
  -- Notificar aprobación y solicitar firma de gerente
  IF NEW.status = 'pending_signature' AND OLD.status != 'pending_signature' THEN
    -- Notificar al residente que fue aprobado
    IF NEW.created_by IS NOT NULL THEN
      PERFORM create_notification(
        NEW.created_by,
        'biweekly_report_approved',
        'Informe quincenal aprobado',
        'Tu informe ' || NEW.report_number || ' ha sido aprobado por el supervisor y está pendiente de firma de gerencia.',
        'biweekly_report',
        NEW.id,
        NEW.project_id,
        'normal',
        jsonb_build_object(
          'report_id', NEW.id,
          'report_number', NEW.report_number,
          'approved_by', NEW.approved_by
        )
      );
    END IF;
    
    -- Notificar a gerente para firma
    SELECT id INTO v_gerente_id
    FROM profiles
    WHERE role = 'gerente'
      AND is_active = TRUE
    LIMIT 1;
    
    IF v_gerente_id IS NOT NULL THEN
      PERFORM create_notification(
        v_gerente_id,
        'biweekly_report_pending_signature',
        'Informe quincenal pendiente de firma',
        'El informe ' || NEW.report_number || ' del proyecto ' || v_project_name || ' está listo para tu firma.',
        'biweekly_report',
        NEW.id,
        NEW.project_id,
        'high',
        jsonb_build_object(
          'report_id', NEW.id,
          'report_number', NEW.report_number,
          'approved_by', NEW.approved_by
        )
      );
    END IF;
  END IF;
  
  -- Notificar publicación
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    -- Notificar al residente
    IF NEW.created_by IS NOT NULL THEN
      PERFORM create_notification(
        NEW.created_by,
        'biweekly_report_published',
        'Informe quincenal publicado',
        'Tu informe ' || NEW.report_number || ' ha sido firmado y publicado.',
        'biweekly_report',
        NEW.id,
        NEW.project_id,
        'normal',
        jsonb_build_object(
          'report_id', NEW.id,
          'report_number', NEW.report_number
        )
      );
    END IF;
    
    -- Notificar al supervisor
    IF NEW.approved_by IS NOT NULL THEN
      PERFORM create_notification(
        NEW.approved_by,
        'biweekly_report_published',
        'Informe quincenal publicado',
        'El informe ' || NEW.report_number || ' ha sido firmado por gerencia y publicado.',
        'biweekly_report',
        NEW.id,
        NEW.project_id,
        'normal',
        jsonb_build_object(
          'report_id', NEW.id,
          'report_number', NEW.report_number
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_biweekly_review ON biweekly_reports;
CREATE TRIGGER trigger_notify_biweekly_review
  AFTER UPDATE ON biweekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_biweekly_report_review();

-- 8. Función para aprobar informe (supervisor)
DROP FUNCTION IF EXISTS approve_biweekly_report(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION approve_biweekly_report(
  p_report_id UUID,
  p_supervisor_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_signature_url TEXT;
BEGIN
  -- Obtener firma del supervisor
  SELECT signature_url INTO v_signature_url
  FROM profiles
  WHERE id = p_supervisor_id;
  
  -- Actualizar informe
  UPDATE biweekly_reports
  SET 
    status = 'pending_signature',
    approved_by = p_supervisor_id,
    approved_at = NOW(),
    reviewed_by = p_supervisor_id,
    reviewed_at = NOW(),
    signed_by_supervisor = p_supervisor_id,
    supervisor_signature_url = v_signature_url,
    supervisor_signed_at = NOW(),
    supervisor_notes = COALESCE(p_notes, supervisor_notes),
    updated_at = NOW()
  WHERE id = p_report_id
    AND status = 'pending_review';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Función para firmar informe (gerente)
DROP FUNCTION IF EXISTS sign_biweekly_report(UUID, UUID);
CREATE OR REPLACE FUNCTION sign_biweekly_report(
  p_report_id UUID,
  p_gerente_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_signature_url TEXT;
BEGIN
  -- Obtener firma del gerente
  SELECT signature_url INTO v_signature_url
  FROM profiles
  WHERE id = p_gerente_id;
  
  -- Actualizar informe
  UPDATE biweekly_reports
  SET 
    status = 'published',
    signed_by_gerente = p_gerente_id,
    gerente_signature_url = v_signature_url,
    gerente_signed_at = NOW(),
    published_at = NOW(),
    updated_at = NOW()
  WHERE id = p_report_id
    AND status = 'pending_signature';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Función para rechazar informe (supervisor)
DROP FUNCTION IF EXISTS reject_biweekly_report(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION reject_biweekly_report(
  p_report_id UUID,
  p_supervisor_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE biweekly_reports
  SET 
    status = 'rejected',
    reviewed_by = p_supervisor_id,
    reviewed_at = NOW(),
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_report_id
    AND status = 'pending_review';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Actualizar políticas RLS
DROP POLICY IF EXISTS "Users can view their project reports" ON biweekly_reports;
CREATE POLICY "Users can view their project reports"
  ON biweekly_reports FOR SELECT
  USING (
    -- Miembros del proyecto
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = biweekly_reports.project_id
        AND pm.user_id = auth.uid()
        AND pm.is_active = TRUE
    )
    OR
    -- Gerentes pueden ver todos
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('gerente', 'super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Residents can create reports" ON biweekly_reports;
CREATE POLICY "Residents can create reports"
  ON biweekly_reports FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'supervisor')
    )
  );

DROP POLICY IF EXISTS "Users can update reports based on role" ON biweekly_reports;
CREATE POLICY "Users can update reports based on role"
  ON biweekly_reports FOR UPDATE
  USING (
    -- Residente puede editar sus borradores o rechazados
    (created_by = auth.uid() AND status IN ('draft', 'rejected'))
    OR
    -- Supervisor puede aprobar/rechazar
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'super_admin', 'admin')
    )
    OR
    -- Gerente puede firmar
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gerente'
    )
  );

-- 12. Comentarios
COMMENT ON FUNCTION generate_report_number IS 'Genera número único de informe quincenal: PROYECTO-IQ-YYYYMM-NN';
COMMENT ON FUNCTION collect_report_data IS 'Recopila datos de bitácoras, QC y fotos para el período del informe';
COMMENT ON FUNCTION approve_biweekly_report IS 'Aprueba informe y agrega firma del supervisor';
COMMENT ON FUNCTION sign_biweekly_report IS 'Firma final del gerente y publica el informe';
COMMENT ON FUNCTION reject_biweekly_report IS 'Rechaza informe con motivo para corrección del residente';
