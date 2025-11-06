-- =====================================================
-- MIGRACIÓN 072: Plantillas de Informes por Proyecto
-- =====================================================
-- Permite a Santiago configurar plantillas específicas para cada proyecto

-- 1. Tabla de plantillas por proyecto
CREATE TABLE IF NOT EXISTS project_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  
  -- Configuración visual (heredada de report_templates)
  header_config JSONB DEFAULT '{
    "show_logo": true,
    "show_project_code": true,
    "show_date": true
  }'::jsonb,
  
  footer_config JSONB DEFAULT '{
    "show_page_numbers": true,
    "show_signatures": true
  }'::jsonb,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Auditoría
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único parcial para solo una plantilla por defecto por proyecto
CREATE UNIQUE INDEX unique_default_per_project 
  ON project_report_templates(project_id) 
  WHERE is_default = true;

-- 2. Modificar section_templates para soportar plantillas de proyecto
ALTER TABLE section_templates 
  ADD COLUMN IF NOT EXISTS project_template_id UUID REFERENCES project_report_templates(id) ON DELETE CASCADE;

-- Hacer report_template_id opcional (puede ser NULL si es de proyecto)
ALTER TABLE section_templates 
  ALTER COLUMN report_template_id DROP NOT NULL;

-- 3. Agregar campos para contenido base y mapeo de datos
ALTER TABLE section_templates
  ADD COLUMN IF NOT EXISTS base_content TEXT,
  ADD COLUMN IF NOT EXISTS data_mappings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS placeholder_help TEXT;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_project_templates_project 
  ON project_report_templates(project_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_section_templates_project 
  ON section_templates(project_template_id) WHERE is_active = true;

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_project_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_template_timestamp
  BEFORE UPDATE ON project_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_project_template_timestamp();

-- 6. RLS Policies
ALTER TABLE project_report_templates ENABLE ROW LEVEL SECURITY;

-- Miembros del proyecto pueden ver plantillas
CREATE POLICY "Miembros pueden ver plantillas del proyecto"
  ON project_report_templates
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Solo supervisores y admins pueden crear/editar plantillas
CREATE POLICY "Supervisores pueden gestionar plantillas"
  ON project_report_templates
  FOR ALL
  TO authenticated
  USING (
    -- Es miembro del proyecto con rol supervisor o superior
    project_id IN (
      SELECT pm.project_id 
      FROM project_members pm
      JOIN profiles p ON pm.user_id = p.id
      WHERE pm.user_id = auth.uid() 
        AND pm.is_active = true
        AND p.role IN ('supervisor', 'admin', 'super_admin')
    )
    OR
    -- Es admin/super_admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id 
      FROM project_members pm
      JOIN profiles p ON pm.user_id = p.id
      WHERE pm.user_id = auth.uid() 
        AND pm.is_active = true
        AND p.role IN ('supervisor', 'admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 7. Función para clonar plantilla global a proyecto
CREATE OR REPLACE FUNCTION clone_template_to_project(
  p_template_id UUID,
  p_project_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_new_template_id UUID;
  v_section RECORD;
  v_template RECORD;
BEGIN
  -- Obtener plantilla global
  SELECT * INTO v_template
  FROM report_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plantilla no encontrada';
  END IF;
  
  -- Crear plantilla de proyecto
  INSERT INTO project_report_templates (
    project_id,
    template_name,
    description,
    header_config,
    footer_config,
    is_active,
    is_default,
    created_by
  ) VALUES (
    p_project_id,
    v_template.template_name || ' (Proyecto)',
    'Clonada de plantilla global',
    v_template.header_config,
    v_template.footer_config,
    true,
    true,
    p_user_id
  )
  RETURNING id INTO v_new_template_id;
  
  -- Clonar secciones
  FOR v_section IN 
    SELECT * FROM section_templates 
    WHERE report_template_id = p_template_id AND is_active = true
  LOOP
    INSERT INTO section_templates (
      project_template_id,
      section_key,
      section_name,
      section_order,
      content_template,
      base_content,
      use_ai,
      data_sources,
      is_active
    ) VALUES (
      v_new_template_id,
      v_section.section_key,
      v_section.section_name,
      v_section.section_order,
      v_section.content_template,
      v_section.content_template, -- Inicialmente igual
      v_section.use_ai,
      v_section.data_sources,
      true
    );
  END LOOP;
  
  RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Comentarios
COMMENT ON TABLE project_report_templates IS 'Plantillas de informes específicas por proyecto';
COMMENT ON COLUMN section_templates.base_content IS 'Contenido base escrito por el supervisor con placeholders';
COMMENT ON COLUMN section_templates.data_mappings IS 'Configuración de qué datos insertar y cómo formatearlos';
COMMENT ON COLUMN section_templates.placeholder_help IS 'Ayuda sobre placeholders disponibles: {{bitacora.actividades}}, {{qc.ensayos}}';

-- 9. Datos de ejemplo de placeholders
UPDATE section_templates 
SET placeholder_help = '
Placeholders disponibles:
- {{project_name}}: Nombre del proyecto
- {{project_code}}: Código del proyecto
- {{period_start}}: Fecha inicio del período
- {{period_end}}: Fecha fin del período
- {{bitacora.actividades}}: Lista de actividades de bitácoras
- {{bitacora.personal}}: Personal registrado en bitácoras
- {{qc.ensayos}}: Tabla de ensayos de control de calidad
- {{qc.resultados}}: Resumen de resultados de QC
- {{fotos}}: Galería de fotos del período
'
WHERE project_template_id IS NOT NULL OR report_template_id IS NOT NULL;
