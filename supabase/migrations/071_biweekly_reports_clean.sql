-- =====================================================
-- MIGRACIÓN 071: Sistema de Informes Quincenales (limpia)
-- =====================================================
-- Integrado con report_templates y section_templates existentes

-- 1. Eliminar tabla biweekly_reports si existe (para recrearla limpia)
DROP TABLE IF EXISTS biweekly_reports CASCADE;

-- 2. Crear tabla de informes quincenales
CREATE TABLE biweekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  
  -- Período del informe
  report_number VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Estado del informe
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  
  -- Títulos
  short_title TEXT,
  long_title TEXT,
  
  -- Contenido del informe (HTML generado por IA + ediciones del residente)
  content JSONB DEFAULT '{}'::jsonb,
  
  -- Datos fuente para el informe (auto-recopilados)
  source_data JSONB DEFAULT '{}'::jsonb,
  
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

-- 3. Crear plantilla de informe quincenal si no existe
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id
  FROM report_templates
  WHERE template_name = 'Informe Quincenal de Interventoría'
    AND company_id IS NULL;
  
  IF v_template_id IS NULL THEN
    INSERT INTO report_templates (
      company_id,
      template_name,
      template_type,
      header_config,
      footer_config,
      sections,
      is_default,
      is_active
    ) VALUES (
      NULL,
      'Informe Quincenal de Interventoría',
      'interventoria_administrativa',
      jsonb_build_object(
        'logo_url', '',
        'company_name', 'TALENTO INMOBILIARIO',
        'show_project_code', true,
        'show_date', true,
        'background_color', '#ffffff',
        'text_color', '#000000',
        'height', 100
      ),
      jsonb_build_object(
        'show_page_numbers', true,
        'show_generation_date', true,
        'custom_text', 'Documento confidencial - Interventoría',
        'include_signatures', true,
        'text_color', '#666666',
        'height', 80
      ),
      jsonb_build_object(
        'cover_page', true,
        'table_of_contents', true,
        'executive_summary', true,
        'ai_insights', true,
        'detailed_logs', true,
        'photos', true,
        'signatures', true
      ),
      true,
      true
    )
    RETURNING id INTO v_template_id;
  END IF;
  
  -- Insertar secciones
  IF v_template_id IS NOT NULL THEN
    INSERT INTO section_templates (report_template_id, section_key, section_name, section_order, content_template, use_ai, data_sources) VALUES
    (v_template_id, 'section_1', 'INFORMACIÓN GENERAL', 1, 
     'Genera una introducción formal del informe incluyendo objetivo, descripción del proyecto y ubicación.',
     true, '["project_info"]'::jsonb),
    
    (v_template_id, 'section_1_1', 'OBJETIVO DEL INFORME', 2,
     'Describe el objetivo del informe quincenal de interventoría de forma técnica y profesional.',
     true, '["project_info"]'::jsonb),
    
    (v_template_id, 'section_1_2', 'DESCRIPCIÓN DEL PROYECTO', 3,
     'Describe detalladamente el proyecto, su alcance y características principales.',
     true, '["project_info"]'::jsonb),
    
    (v_template_id, 'section_1_3', 'DIRECCIÓN DEL PROYECTO', 4,
     'Detalla la ubicación exacta del proyecto y datos de contacto relevantes.',
     true, '["project_info"]'::jsonb),
    
    (v_template_id, 'section_2', 'CONTROL ACTIVIDADES TÉCNICAS EJECUTADAS', 5,
     'Resume las actividades técnicas ejecutadas durante el período del informe basándote en las bitácoras diarias.',
     true, '["daily_logs", "photos"]'::jsonb),
    
    (v_template_id, 'section_3', 'PROGRAMA DE CONTROL Y SEGUIMIENTO', 6,
     'Describe el programa de control y seguimiento implementado.',
     true, '["daily_logs", "quality_samples"]'::jsonb),
    
    (v_template_id, 'section_3_1', 'CONTROL DE DOCUMENTOS', 7,
     'Lista y describe el control de documentos técnicos del proyecto.',
     true, '["daily_logs"]'::jsonb),
    
    (v_template_id, 'section_3_2', 'CONTROL DE CALIDAD Y CONTROL DE MATERIALES', 8,
     'Detalla los ensayos de calidad realizados, resultados y cumplimiento de especificaciones.',
     true, '["quality_samples"]'::jsonb),
    
    (v_template_id, 'section_3_3', 'PÓLIZAS', 9,
     'Verifica el estado de las pólizas del proyecto.',
     true, '["project_info"]'::jsonb),
    
    (v_template_id, 'section_4', 'CONTROL Y MANEJO AMBIENTAL', 10,
     'Describe las medidas de control ambiental implementadas durante el período.',
     true, '["daily_logs"]'::jsonb),
    
    (v_template_id, 'section_5', 'REGISTRO FOTOGRÁFICO', 11,
     'Incluye el registro fotográfico del avance de obra.',
     true, '["photos"]'::jsonb),
    
    (v_template_id, 'section_6', 'CONCLUSIONES Y RECOMENDACIONES', 12,
     'Genera conclusiones técnicas y recomendaciones basadas en el avance y hallazgos del período.',
     true, '["daily_logs", "quality_samples"]'::jsonb)
    ON CONFLICT (report_template_id, section_key) DO NOTHING;
  END IF;
END $$;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_biweekly_reports_project ON biweekly_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_biweekly_reports_status ON biweekly_reports(status);
CREATE INDEX IF NOT EXISTS idx_biweekly_reports_period ON biweekly_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_biweekly_reports_created_by ON biweekly_reports(created_by);

-- 5. RLS Policies
ALTER TABLE biweekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their project reports" ON biweekly_reports;
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

DROP POLICY IF EXISTS "Residents can create reports" ON biweekly_reports;
CREATE POLICY "Residents can create reports"
  ON biweekly_reports FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('super_admin', 'supervisor')
    )
  );

DROP POLICY IF EXISTS "Users can update reports based on role" ON biweekly_reports;
CREATE POLICY "Users can update reports based on role"
  ON biweekly_reports FOR UPDATE
  USING (
    (created_by = auth.uid() AND status IN ('draft', 'rejected'))
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('super_admin', 'supervisor')
    )
  );

-- 6. Comentarios
COMMENT ON TABLE biweekly_reports IS 'Informes quincenales de interventoría generados con IA y editados por residentes - Integrado con report_templates';
