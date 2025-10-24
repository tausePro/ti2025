-- =====================================================
-- MIGRACIÓN 048: CONFIGURACIÓN DE BITÁCORAS POR PROYECTO
-- =====================================================
-- Permite a supervisores configurar campos personalizados
-- para las bitácoras de cada proyecto

-- Tabla de configuración de bitácoras
CREATE TABLE IF NOT EXISTS daily_log_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Estado del módulo
  is_enabled BOOLEAN DEFAULT true,
  
  -- Campos personalizados (JSON array)
  -- Estructura: [{ id, name, type, required, options, order }]
  custom_fields JSONB DEFAULT '[]'::jsonb,
  
  -- Configuración de checklists personalizados
  custom_checklists JSONB DEFAULT '[]'::jsonb,
  
  -- Configuración general
  settings JSONB DEFAULT '{
    "require_photos": false,
    "min_photos": 0,
    "max_photos": 10,
    "require_signatures": false,
    "require_gps": false,
    "auto_assign_resident": true
  }'::jsonb,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un solo config por proyecto
  UNIQUE(project_id)
);

-- Índices
CREATE INDEX idx_daily_log_configs_project ON daily_log_configs(project_id);
CREATE INDEX idx_daily_log_configs_enabled ON daily_log_configs(is_enabled);

-- RLS
ALTER TABLE daily_log_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Supervisores y admins pueden ver configs de sus proyectos
CREATE POLICY "view_daily_log_configs" ON daily_log_configs
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE id IN (
        SELECT project_id FROM project_team 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Solo supervisores y admins pueden crear/editar configs
CREATE POLICY "manage_daily_log_configs" ON daily_log_configs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_team pt
      INNER JOIN profiles p ON p.id = pt.user_id
      WHERE pt.project_id = daily_log_configs.project_id
        AND pt.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_team pt
      INNER JOIN profiles p ON p.id = pt.user_id
      WHERE pt.project_id = daily_log_configs.project_id
        AND pt.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'supervisor')
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_daily_log_configs_updated_at
  BEFORE UPDATE ON daily_log_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE daily_log_configs IS 'Configuración de bitácoras por proyecto - campos personalizados y settings';
COMMENT ON COLUMN daily_log_configs.custom_fields IS 'Array de campos personalizados: [{ id, name, type, required, options, order }]';
COMMENT ON COLUMN daily_log_configs.custom_checklists IS 'Checklists personalizados adicionales a los default';
COMMENT ON COLUMN daily_log_configs.settings IS 'Configuración general: fotos requeridas, firmas, GPS, etc.';
