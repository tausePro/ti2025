-- =====================================================
-- MIGRACIÓN 069: Quality Reports y Notification Preferences (limpia)
-- =====================================================

-- 1. Tabla de informes de calidad
CREATE TABLE IF NOT EXISTS quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES quality_control_samples(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_number VARCHAR(50) NOT NULL,
  report_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  
  -- Contenido del informe (80% auto-generado)
  auto_generated_content JSONB DEFAULT '{}',
  -- Ajustes del residente (20% manual)
  resident_adjustments JSONB DEFAULT '{}',
  
  -- Metadatos
  generated_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Usuarios involucrados
  created_by UUID REFERENCES profiles(id),
  submitted_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  
  -- Comentarios y observaciones
  resident_notes TEXT,
  supervisor_notes TEXT,
  rejection_reason TEXT,
  
  -- Versiones
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES quality_reports(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_sample_report UNIQUE(sample_id, version)
);

-- Índices para quality_reports
CREATE INDEX IF NOT EXISTS idx_quality_reports_sample ON quality_reports(sample_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_project ON quality_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_status ON quality_reports(status);
CREATE INDEX IF NOT EXISTS idx_quality_reports_date ON quality_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_quality_reports_created_by ON quality_reports(created_by);

-- 2. Tabla de configuración de notificaciones por usuario
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Canales de notificación
  email_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  
  -- Tipos de notificaciones habilitadas
  notification_types JSONB DEFAULT '{}',
  
  -- Horarios de notificación
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- 3. Función para crear notificación
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_related_type VARCHAR DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_priority VARCHAR DEFAULT 'normal',
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Crear notificación
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_type,
    related_id,
    project_id,
    priority,
    data
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_related_type,
    p_related_id,
    p_project_id,
    p_priority,
    p_data
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para generar borrador de informe automáticamente
CREATE OR REPLACE FUNCTION auto_generate_report_draft(
  p_sample_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
  v_sample RECORD;
  v_tests JSONB;
  v_report_number VARCHAR;
  v_resident_id UUID;
BEGIN
  -- Obtener información de la muestra
  SELECT 
    qs.*,
    p.id as project_id,
    p.project_code
  INTO v_sample
  FROM quality_control_samples qs
  JOIN projects p ON p.id = qs.project_id
  WHERE qs.id = p_sample_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Muestra no encontrada';
  END IF;
  
  -- Verificar si ya existe un borrador
  IF EXISTS (
    SELECT 1 FROM quality_reports 
    WHERE sample_id = p_sample_id 
    AND status = 'draft'
  ) THEN
    RAISE NOTICE 'Ya existe un borrador para esta muestra';
    RETURN NULL;
  END IF;
  
  -- Obtener ensayos de la muestra
  SELECT jsonb_agg(
    jsonb_build_object(
      'test_name', test_name,
      'test_period', test_period,
      'test_date', test_date,
      'status', status
    )
  ) INTO v_tests
  FROM quality_control_tests
  WHERE sample_id = p_sample_id;
  
  -- Generar número de informe
  v_report_number := v_sample.project_code || '-CC-' || 
                     TO_CHAR(NOW(), 'YYYYMM') || '-' ||
                     LPAD((SELECT COUNT(*) + 1 FROM quality_reports)::TEXT, 4, '0');
  
  -- Obtener residente asignado al proyecto
  SELECT pm.user_id INTO v_resident_id
  FROM project_members pm
  JOIN profiles pr ON pr.id = pm.user_id
  WHERE pm.project_id = v_sample.project_id
    AND pm.is_active = TRUE
    AND pr.role = 'residente'
  LIMIT 1;
  
  -- Crear borrador de informe
  INSERT INTO quality_reports (
    sample_id,
    project_id,
    report_number,
    report_date,
    status,
    auto_generated_content,
    generated_at,
    created_by
  ) VALUES (
    p_sample_id,
    v_sample.project_id,
    v_report_number,
    CURRENT_DATE,
    'draft',
    jsonb_build_object(
      'sample_info', jsonb_build_object(
        'sample_number', v_sample.sample_number,
        'sample_code', v_sample.sample_code,
        'sample_date', v_sample.sample_date,
        'location', v_sample.location
      ),
      'tests', COALESCE(v_tests, '[]'::jsonb),
      'overall_result', v_sample.overall_result,
      'generated_date', NOW()
    ),
    NOW(),
    v_resident_id
  )
  RETURNING id INTO v_report_id;
  
  -- Crear notificación para el residente
  IF v_resident_id IS NOT NULL THEN
    PERFORM create_notification(
      v_resident_id,
      'report_draft_ready',
      'Borrador de informe disponible',
      'Se ha generado el borrador del informe ' || v_report_number || '. Por favor revísalo y ajústalo según sea necesario.',
      'quality_report',
      v_report_id,
      v_sample.project_id,
      'high',
      jsonb_build_object(
        'report_id', v_report_id,
        'sample_id', p_sample_id,
        'report_number', v_report_number
      )
    );
  END IF;
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para notificar cuando se envía un informe
CREATE OR REPLACE FUNCTION notify_report_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_supervisor_id UUID;
  v_project_code VARCHAR;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    
    SELECT project_code INTO v_project_code
    FROM projects
    WHERE id = NEW.project_id;
    
    SELECT pm.user_id INTO v_supervisor_id
    FROM project_members pm
    JOIN profiles pr ON pr.id = pm.user_id
    WHERE pm.project_id = NEW.project_id
      AND pm.is_active = TRUE
      AND pr.role = 'supervisor'
    LIMIT 1;
    
    IF v_supervisor_id IS NOT NULL THEN
      PERFORM create_notification(
        v_supervisor_id,
        'report_submitted',
        'Informe enviado para revisión',
        'El residente ha enviado el informe ' || NEW.report_number || ' del proyecto ' || v_project_code || ' para tu revisión.',
        'quality_report',
        NEW.id,
        NEW.project_id,
        'high',
        jsonb_build_object(
          'report_id', NEW.id,
          'report_number', NEW.report_number,
          'submitted_by', NEW.submitted_by
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_report_submission ON quality_reports;
CREATE TRIGGER trigger_notify_report_submission
  AFTER UPDATE ON quality_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_submission();

-- 6. Trigger para notificar aprobación/rechazo
CREATE OR REPLACE FUNCTION notify_report_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM create_notification(
      NEW.submitted_by,
      'report_approved',
      'Informe aprobado',
      'Tu informe ' || NEW.report_number || ' ha sido aprobado por el supervisor.',
      'quality_report',
      NEW.id,
      NEW.project_id,
      'normal',
      jsonb_build_object(
        'report_id', NEW.id,
        'report_number', NEW.report_number,
        'reviewed_by', NEW.reviewed_by
      )
    );
  END IF;
  
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    PERFORM create_notification(
      NEW.submitted_by,
      'report_rejected',
      'Informe rechazado',
      'Tu informe ' || NEW.report_number || ' ha sido rechazado. Motivo: ' || COALESCE(NEW.rejection_reason, 'No especificado'),
      'quality_report',
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_report_review ON quality_reports;
CREATE TRIGGER trigger_notify_report_review
  AFTER UPDATE ON quality_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_review();

-- 7. RLS Policies para quality_reports
ALTER TABLE quality_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their project reports" ON quality_reports;
CREATE POLICY "Users can view their project reports"
  ON quality_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = quality_reports.project_id
        AND pm.user_id = auth.uid()
        AND pm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Residents can create report drafts" ON quality_reports;
CREATE POLICY "Residents can create report drafts"
  ON quality_reports FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('super_admin', 'supervisor')
    )
  );

DROP POLICY IF EXISTS "Users can update reports based on role" ON quality_reports;
CREATE POLICY "Users can update reports based on role"
  ON quality_reports FOR UPDATE
  USING (
    (created_by = auth.uid() AND status IN ('draft', 'rejected'))
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('super_admin', 'supervisor')
    )
  );

-- 8. RLS Policies para notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Comentarios
COMMENT ON TABLE quality_reports IS 'Informes de control de calidad generados automáticamente y ajustados por residentes';
COMMENT ON TABLE notification_preferences IS 'Preferencias de notificación por usuario';
