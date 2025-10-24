-- =====================================================
-- MIGRACIÓN 049: CREAR TABLA DAILY_LOG_CONFIGS
-- =====================================================
-- Configuración de bitácoras por proyecto
-- Permite a supervisores personalizar campos y requisitos

-- Crear tabla
CREATE TABLE IF NOT EXISTS daily_log_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL,
  
  -- Estado del módulo
  is_enabled BOOLEAN DEFAULT true,
  
  -- Campos personalizados (JSON array)
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
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT daily_log_configs_project_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT daily_log_configs_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT daily_log_configs_project_unique 
    UNIQUE(project_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_log_configs_project 
  ON daily_log_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_configs_enabled 
  ON daily_log_configs(is_enabled);

-- Habilitar RLS
ALTER TABLE daily_log_configs ENABLE ROW LEVEL SECURITY;

-- Política: Miembros del proyecto pueden ver la configuración
DROP POLICY IF EXISTS "view_daily_log_configs" ON daily_log_configs;
CREATE POLICY "view_daily_log_configs" ON daily_log_configs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = daily_log_configs.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Política: Solo supervisores y admins pueden crear/editar
DROP POLICY IF EXISTS "manage_daily_log_configs" ON daily_log_configs;
CREATE POLICY "manage_daily_log_configs" ON daily_log_configs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      INNER JOIN profiles p ON p.id = pm.user_id
      WHERE pm.project_id = daily_log_configs.project_id
        AND pm.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      INNER JOIN profiles p ON p.id = pm.user_id
      WHERE pm.project_id = daily_log_configs.project_id
        AND pm.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'supervisor')
    )
  );

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_daily_log_configs_updated_at ON daily_log_configs;
CREATE TRIGGER update_daily_log_configs_updated_at
  BEFORE UPDATE ON daily_log_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE daily_log_configs IS 
  'Configuración de bitácoras por proyecto - campos personalizados y settings';
COMMENT ON COLUMN daily_log_configs.custom_fields IS 
  'Array de campos personalizados: [{ id, name, label, type, required, options, order, placeholder, helpText }]';
COMMENT ON COLUMN daily_log_configs.custom_checklists IS 
  'Checklists personalizados adicionales a los default';
COMMENT ON COLUMN daily_log_configs.settings IS 
  'Configuración general: require_photos, min_photos, max_photos, require_signatures, require_gps, auto_assign_resident';

-- Verificación
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'daily_log_configs'
ORDER BY ordinal_position;
