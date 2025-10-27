-- =====================================================
-- MIGRACIÓN 061: PLANTILLAS DE SECCIONES PRECONFIGURADAS
-- =====================================================
-- Permite preconfigurar el contenido de cada sección

-- 1. Tabla de plantillas de secciones
CREATE TABLE IF NOT EXISTS section_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
  
  -- Identificación de la sección
  section_key TEXT NOT NULL, -- 'executive_summary', 'progress_status', etc.
  section_name TEXT NOT NULL,
  section_order INTEGER DEFAULT 0,
  
  -- Contenido preconfigurado
  content_template TEXT, -- Template con placeholders: {{project_name}}, {{date}}, etc.
  use_ai BOOLEAN DEFAULT true, -- Si debe usar IA para generar contenido
  ai_config_id UUID REFERENCES ai_writing_config(id) ON DELETE SET NULL,
  
  -- Configuración de datos a incluir
  data_sources JSONB DEFAULT '[]'::jsonb, -- Qué datos incluir: ["daily_logs", "financial_orders", "photos"]
  filters JSONB DEFAULT '{}'::jsonb, -- Filtros para los datos
  
  -- Formato y estilo
  include_charts BOOLEAN DEFAULT false,
  chart_types TEXT[], -- ['bar', 'line', 'pie']
  include_photos BOOLEAN DEFAULT false,
  max_photos INTEGER DEFAULT 4,
  
  -- Metadatos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(report_template_id, section_key)
);

-- 2. Índices
CREATE INDEX idx_section_templates_report ON section_templates(report_template_id);
CREATE INDEX idx_section_templates_active ON section_templates(is_active) WHERE is_active = true;

-- 3. Trigger para updated_at
CREATE TRIGGER update_section_templates_updated_at
  BEFORE UPDATE ON section_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE section_templates ENABLE ROW LEVEL SECURITY;

-- Política SELECT
CREATE POLICY "Usuarios con permiso pueden ver plantillas de secciones"
  ON section_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::user_role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 
      FROM role_permissions rp
      WHERE rp.role = (SELECT role::user_role FROM profiles WHERE id = auth.uid())
      AND rp.module = 'plantillas_pdf'
      AND rp.action = 'read'
      AND rp.allowed = true
    )
  );

-- Política INSERT
CREATE POLICY "Admin puede crear plantillas de secciones"
  ON section_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::user_role IN ('admin', 'super_admin')
    )
  );

-- Política UPDATE
CREATE POLICY "Admin puede actualizar plantillas de secciones"
  ON section_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::user_role IN ('admin', 'super_admin')
    )
  );

-- Política DELETE
CREATE POLICY "Admin puede eliminar plantillas de secciones"
  ON section_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::user_role IN ('admin', 'super_admin')
    )
  );

-- 5. Comentarios
COMMENT ON TABLE section_templates IS 'Plantillas preconfiguradas para cada sección de los informes';
COMMENT ON COLUMN section_templates.content_template IS 'Template con placeholders: {{project_name}}, {{date}}, {{progress}}, etc.';
COMMENT ON COLUMN section_templates.data_sources IS 'Fuentes de datos a incluir: daily_logs, financial_orders, photos, checklists';
COMMENT ON COLUMN section_templates.use_ai IS 'Si debe usar IA para generar/mejorar el contenido';
