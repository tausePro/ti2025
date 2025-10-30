-- =====================================================
-- MIGRACIÓN 070: Sistema de Informes Quincenales
-- =====================================================
-- Sistema completo para informes de interventoría quincenal
-- con generación automática por IA y edición WYSIWYG

-- 1. Tabla de informes quincenales
CREATE TABLE IF NOT EXISTS biweekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Período del informe
  report_number VARCHAR(50) NOT NULL, -- Ej: "PROJ-2025-01-Q1"
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Estado del informe
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Estados: draft, in_review, submitted, approved, rejected, published
  
  -- Títulos
  short_title TEXT, -- "Informe Quincenal 01/2025"
  long_title TEXT, -- "INFORME QUINCENAL DE INTERVENTORÍA Y SUPERVISIÓN TÉCNICA INDEPENDIENTE"
  
  -- Contenido del informe (HTML generado por IA + ediciones del residente)
  content JSONB DEFAULT '{}'::jsonb,
  -- Estructura: {
  --   "section_1": {"title": "INFORMACIÓN GENERAL", "content": "<html>...</html>"},
  --   "section_2": {"title": "CONTROL ACTIVIDADES", "content": "<html>...</html>"},
  --   ...
  -- }
  
  -- Datos fuente para el informe (auto-recopilados)
  source_data JSONB DEFAULT '{}'::jsonb,
  -- Estructura: {
  --   "daily_logs": [...],
  --   "quality_samples": [...],
  --   "financial_orders": [...],
  --   "photos": [...],
  --   "project_info": {...}
  -- }
  
  -- Configuración de generación con IA
  ai_config_id UUID REFERENCES ai_writing_config(id),
  ai_generated_at TIMESTAMPTZ,
  ai_generation_tokens INTEGER,
  
  -- Metadatos de flujo
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
  previous_version_id UUID REFERENCES biweekly_reports(id),
  
  -- PDF generado
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_project_period UNIQUE(project_id, period_start, period_end, version)
);

-- 2. Tabla de secciones del informe (plantillas)
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  section_key VARCHAR(50) NOT NULL UNIQUE, -- "section_1_info_general"
  section_number VARCHAR(10) NOT NULL, -- "1", "1.1", "3.2"
  section_title TEXT NOT NULL,
  
  -- Orden y jerarquía
  parent_section_id UUID REFERENCES report_sections(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Configuración de contenido
  content_template TEXT, -- Template HTML con placeholders
  use_ai BOOLEAN DEFAULT true,
  ai_prompt TEXT, -- Prompt específico para esta sección
  
  -- Fuentes de datos a incluir
  data_sources JSONB DEFAULT '[]'::jsonb,
  -- ["daily_logs", "quality_samples", "financial_orders", "photos"]
  
  -- Configuración de formato
  include_in_toc BOOLEAN DEFAULT true, -- Incluir en tabla de contenidos
  page_break_before BOOLEAN DEFAULT false,
  
  -- Metadatos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insertar secciones estándar del informe
INSERT INTO report_sections (section_key, section_number, section_title, display_order, ai_prompt, data_sources) VALUES
  ('section_1', '1', 'INFORMACIÓN GENERAL', 1, 
   'Genera una introducción formal del informe incluyendo objetivo, descripción del proyecto y ubicación.',
   '["project_info"]'),
  
  ('section_1_1', '1.1', 'OBJETIVO DEL INFORME', 2,
   'Describe el objetivo del informe quincenal de interventoría de forma técnica y profesional.',
   '["project_info"]'),
  
  ('section_1_2', '1.2', 'DESCRIPCIÓN DEL PROYECTO', 3,
   'Describe detalladamente el proyecto, su alcance y características principales.',
   '["project_info"]'),
  
  ('section_1_3', '1.3', 'DIRECCIÓN DEL PROYECTO', 4,
   'Detalla la ubicación exacta del proyecto y datos de contacto relevantes.',
   '["project_info"]'),
  
  ('section_2', '2', 'CONTROL ACTIVIDADES TÉCNICAS EJECUTADAS', 5,
   'Resume las actividades técnicas ejecutadas durante el período del informe basándote en las bitácoras diarias.',
   '["daily_logs", "photos"]'),
  
  ('section_3', '3', 'PROGRAMA DE CONTROL Y SEGUIMIENTO', 6,
   'Describe el programa de control y seguimiento implementado.',
   '["daily_logs", "quality_samples"]'),
  
  ('section_3_1', '3.1', 'CONTROL DE DOCUMENTOS', 7,
   'Lista y describe el control de documentos técnicos del proyecto.',
   '["daily_logs"]'),
  
  ('section_3_2', '3.2', 'CONTROL DE CALIDAD Y CONTROL DE MATERIALES', 8,
   'Detalla los ensayos de calidad realizados, resultados y cumplimiento de especificaciones.',
   '["quality_samples"]'),
  
  ('section_3_3', '3.3', 'PÓLIZAS', 9,
   'Verifica el estado de las pólizas del proyecto.',
   '["project_info"]'),
  
  ('section_4', '4', 'CONTROL Y MANEJO AMBIENTAL', 10,
   'Describe las medidas de control ambiental implementadas durante el período.',
   '["daily_logs"]'),
  
  ('section_5', '5', 'REGISTRO FOTOGRÁFICO', 11,
   'Incluye el registro fotográfico del avance de obra.',
   '["photos"]'),
  
  ('section_6', '6', 'CONCLUSIONES Y RECOMENDACIONES', 12,
   'Genera conclusiones técnicas y recomendaciones basadas en el avance y hallazgos del período.',
   '["daily_logs", "quality_samples"]')
ON CONFLICT (section_key) DO NOTHING;

-- 4. Actualizar jerarquía de secciones
UPDATE report_sections SET parent_section_id = (SELECT id FROM report_sections WHERE section_key = 'section_1')
WHERE section_key IN ('section_1_1', 'section_1_2', 'section_1_3');

UPDATE report_sections SET parent_section_id = (SELECT id FROM report_sections WHERE section_key = 'section_3')
WHERE section_key IN ('section_3_1', 'section_3_2', 'section_3_3');

-- 5. Índices
CREATE INDEX idx_biweekly_reports_project ON biweekly_reports(project_id);
CREATE INDEX idx_biweekly_reports_status ON biweekly_reports(status);
CREATE INDEX idx_biweekly_reports_period ON biweekly_reports(period_start, period_end);
CREATE INDEX idx_biweekly_reports_created_by ON biweekly_reports(created_by);
CREATE INDEX idx_report_sections_order ON report_sections(display_order);

-- 6. Función para recopilar datos del período
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

-- 7. Función para generar número de informe
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
  v_year := TO_CHAR(p_period_start, 'YYYY');
  
  -- Calcular quinzena (1-24 por año)
  v_quinzena := LPAD(
    (EXTRACT(DOY FROM p_period_start)::INTEGER / 15 + 1)::TEXT,
    2, '0'
  );
  
  -- Formato: PROJ-2025-Q01
  v_report_number := v_project_code || '-' || v_year || '-Q' || v_quinzena;
  
  RETURN v_report_number;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para notificar cuando se envía un informe
CREATE OR REPLACE FUNCTION notify_biweekly_report_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_supervisor_id UUID;
  v_project_name TEXT;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    
    SELECT name INTO v_project_name
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
          'submitted_by', NEW.submitted_by
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_biweekly_report_submission ON biweekly_reports;
CREATE TRIGGER trigger_notify_biweekly_report_submission
  AFTER UPDATE ON biweekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_biweekly_report_submission();

-- 9. Trigger para notificar aprobación/rechazo
CREATE OR REPLACE FUNCTION notify_biweekly_report_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM create_notification(
      NEW.submitted_by,
      'biweekly_report_approved',
      'Informe quincenal aprobado',
      'Tu informe ' || NEW.report_number || ' ha sido aprobado por el supervisor.',
      'biweekly_report',
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_biweekly_report_review ON biweekly_reports;
CREATE TRIGGER trigger_notify_biweekly_report_review
  AFTER UPDATE ON biweekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_biweekly_report_review();

-- 10. RLS Policies
ALTER TABLE biweekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;

-- Ver informes: miembros del proyecto
CREATE POLICY "Users can view their project reports"
  ON biweekly_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = biweekly_reports.project_id
        AND pm.user_id = auth.uid()
        AND pm.is_active = TRUE
    )
  );

-- Crear informes: residentes y supervisores
CREATE POLICY "Residents can create reports"
  ON biweekly_reports FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('super_admin', 'supervisor')
    )
  );

-- Actualizar: residentes sus borradores, supervisores cualquiera
CREATE POLICY "Users can update reports based on role"
  ON biweekly_reports FOR UPDATE
  USING (
    (created_by = auth.uid() AND status IN ('draft', 'rejected'))
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('super_admin', 'supervisor')
    )
  );

-- Secciones: todos pueden ver
CREATE POLICY "Users can view report sections"
  ON report_sections FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 11. Comentarios
COMMENT ON TABLE biweekly_reports IS 'Informes quincenales de interventoría generados con IA y editados por residentes';
COMMENT ON TABLE report_sections IS 'Plantillas de secciones para los informes quincenales';
COMMENT ON FUNCTION collect_report_data IS 'Recopila todos los datos del período para generar el informe';
COMMENT ON FUNCTION generate_report_number IS 'Genera número de informe automático: PROJ-2025-Q01';
