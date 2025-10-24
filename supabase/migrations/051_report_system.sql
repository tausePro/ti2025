-- =====================================================
-- SISTEMA DE REPORTES PDF
-- Fecha: 2025-10-24
-- Descripción: Tablas para gestión de reportes PDF con
--              plantillas configurables y almacenamiento
-- =====================================================

-- 1. TABLA: report_templates
-- Plantillas configurables para diferentes tipos de reportes
-- company_id NULL = plantilla global (disponible para todos)
-- company_id NOT NULL = plantilla específica de una empresa
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('daily_log', 'financial', 'general', 'custom')),
  
  -- Configuración de encabezado/membrete
  header_config JSONB DEFAULT '{
    "logo_url": "",
    "company_name": "",
    "show_project_code": true,
    "show_date": true,
    "custom_text": "",
    "background_color": "#ffffff",
    "text_color": "#000000",
    "height": 80
  }'::jsonb,
  
  -- Configuración de pie de página
  footer_config JSONB DEFAULT '{
    "show_page_numbers": true,
    "show_generation_date": true,
    "custom_text": "Documento confidencial",
    "include_signatures": true,
    "text_color": "#666666",
    "height": 60
  }'::jsonb,
  
  -- Estilos generales del documento
  styles JSONB DEFAULT '{
    "primary_color": "#2563eb",
    "secondary_color": "#10b981",
    "accent_color": "#f59e0b",
    "font_family": "Helvetica",
    "page_size": "A4",
    "orientation": "portrait",
    "margins": {"top": 40, "bottom": 40, "left": 40, "right": 40}
  }'::jsonb,
  
  -- Secciones a incluir en el reporte
  sections JSONB DEFAULT '{
    "cover_page": true,
    "table_of_contents": false,
    "executive_summary": true,
    "ai_insights": true,
    "detailed_logs": true,
    "photos": true,
    "checklists": true,
    "custom_fields": true,
    "signatures": true,
    "appendix": false
  }'::jsonb,
  
  -- Configuración específica por tipo de reporte
  type_specific_config JSONB DEFAULT '{}'::jsonb,
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(company_id, template_name)
);

-- 2. TABLA: generated_reports
-- Historial de reportes generados
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  
  -- Tipo y período del reporte
  report_type TEXT NOT NULL CHECK (report_type IN ('daily_log_weekly', 'daily_log_monthly', 'financial', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Archivo generado
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  
  -- Metadatos del reporte
  metadata JSONB DEFAULT '{
    "total_logs": 0,
    "total_photos": 0,
    "avg_personnel": 0,
    "checklist_compliance": 0,
    "issues_count": 0
  }'::jsonb,
  
  -- Resumen generado por IA
  ai_summary TEXT,
  ai_insights JSONB DEFAULT '{
    "achievements": [],
    "concerns": [],
    "recommendations": []
  }'::jsonb,
  
  -- Auditoría
  generated_by UUID NOT NULL REFERENCES profiles(id),
  generated_at TIMESTAMP DEFAULT NOW(),
  
  -- Estado
  status TEXT DEFAULT 'completed' CHECK (status IN ('generating', 'completed', 'failed')),
  error_message TEXT,
  
  -- Vistas y descargas
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP
);

-- 3. TABLA: report_generation_queue
-- Cola para generación asíncrona de reportes pesados
CREATE TABLE IF NOT EXISTS report_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  
  -- Parámetros de generación
  parameters JSONB NOT NULL,
  
  -- Estado de la cola
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  
  -- Progreso
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  current_step TEXT,
  
  -- Resultado
  result_report_id UUID REFERENCES generated_reports(id),
  error_message TEXT,
  
  -- Tiempos
  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Reintentos
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- 4. ÍNDICES para optimización
CREATE INDEX IF NOT EXISTS idx_report_templates_company ON report_templates(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(template_type, is_default);
CREATE INDEX IF NOT EXISTS idx_generated_reports_project ON generated_reports(project_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_period ON generated_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type, status);
CREATE INDEX IF NOT EXISTS idx_report_queue_status ON report_generation_queue(status, priority DESC, requested_at);

-- 5. FUNCIÓN: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_report_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_template_timestamp
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_report_template_timestamp();

-- 6. FUNCIÓN: Incrementar contador de vistas/descargas
CREATE OR REPLACE FUNCTION increment_report_access(
  report_id UUID,
  access_type TEXT -- 'view' o 'download'
)
RETURNS VOID AS $$
BEGIN
  IF access_type = 'view' THEN
    UPDATE generated_reports
    SET view_count = view_count + 1,
        last_accessed_at = NOW()
    WHERE id = report_id;
  ELSIF access_type = 'download' THEN
    UPDATE generated_reports
    SET download_count = download_count + 1,
        last_accessed_at = NOW()
    WHERE id = report_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. POLÍTICAS RLS (Row Level Security)

-- report_templates: Solo admins y usuarios de la misma company
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates from their company or global"
  ON report_templates FOR SELECT
  USING (
    -- Plantillas globales (company_id NULL)
    company_id IS NULL
    OR
    -- Plantillas de su empresa
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage templates"
  ON report_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- generated_reports: Miembros del proyecto pueden ver
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view reports"
  ON generated_reports FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can generate reports for their projects"
  ON generated_reports FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND generated_by = auth.uid()
  );

-- report_generation_queue: Similar a generated_reports
ALTER TABLE report_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their queued reports"
  ON report_generation_queue FOR SELECT
  USING (
    requested_by = auth.uid()
    OR
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can queue reports for their projects"
  ON report_generation_queue FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND requested_by = auth.uid()
  );

-- 8. PLANTILLA POR DEFECTO para bitácoras
INSERT INTO report_templates (
  template_name,
  template_type,
  is_default,
  header_config,
  footer_config,
  styles,
  sections
) VALUES (
  'Reporte de Bitácoras - Estándar',
  'daily_log',
  true,
  '{
    "logo_url": "",
    "company_name": "Talento Inmobiliario",
    "show_project_code": true,
    "show_date": true,
    "custom_text": "Reporte de Bitácoras Diarias",
    "background_color": "#ffffff",
    "text_color": "#1f2937",
    "height": 80
  }'::jsonb,
  '{
    "show_page_numbers": true,
    "show_generation_date": true,
    "custom_text": "Documento confidencial - Uso interno",
    "include_signatures": true,
    "text_color": "#6b7280",
    "height": 60
  }'::jsonb,
  '{
    "primary_color": "#2563eb",
    "secondary_color": "#10b981",
    "accent_color": "#f59e0b",
    "font_family": "Helvetica",
    "page_size": "A4",
    "orientation": "portrait",
    "margins": {"top": 50, "bottom": 50, "left": 40, "right": 40}
  }'::jsonb,
  '{
    "cover_page": true,
    "table_of_contents": false,
    "executive_summary": true,
    "ai_insights": true,
    "detailed_logs": true,
    "photos": true,
    "checklists": true,
    "custom_fields": true,
    "signatures": true,
    "appendix": false
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 9. COMENTARIOS para documentación
COMMENT ON TABLE report_templates IS 'Plantillas configurables para generación de reportes PDF';
COMMENT ON TABLE generated_reports IS 'Historial de reportes PDF generados con metadatos y análisis IA';
COMMENT ON TABLE report_generation_queue IS 'Cola de procesamiento para reportes pesados (asíncrono)';
COMMENT ON COLUMN report_templates.header_config IS 'Configuración JSON del encabezado/membrete';
COMMENT ON COLUMN report_templates.sections IS 'Secciones a incluir en el reporte';
COMMENT ON COLUMN generated_reports.ai_summary IS 'Resumen ejecutivo generado por IA';
COMMENT ON COLUMN generated_reports.metadata IS 'Estadísticas y datos del reporte';
