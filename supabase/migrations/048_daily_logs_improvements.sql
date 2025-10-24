-- =====================================================
-- MIGRACIÓN 048: MEJORAS A BITÁCORAS
-- =====================================================
-- Parte 1: Agregar campos nuevos a daily_logs
-- Parte 2: Crear tabla de configuración daily_log_configs

-- =====================================================
-- PARTE 1: AGREGAR CAMPOS A DAILY_LOGS
-- =====================================================

-- Agregar columna time (hora específica)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_logs' AND column_name = 'time'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN time TIME;
    COMMENT ON COLUMN daily_logs.time IS 'Hora específica de la entrada (HH:MM)';
  END IF;
END $$;

-- Agregar columna assigned_to (usuario asignado)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_logs' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
    COMMENT ON COLUMN daily_logs.assigned_to IS 'Usuario asignado para llenar esta bitácora';
    CREATE INDEX IF NOT EXISTS idx_daily_logs_assigned_to ON daily_logs(assigned_to);
  END IF;
END $$;

-- Agregar columna location (GPS)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_logs' AND column_name = 'location'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN location JSONB;
    COMMENT ON COLUMN daily_logs.location IS 'Ubicación GPS: {latitude, longitude, accuracy, timestamp}';
  END IF;
END $$;

-- Agregar columna signatures (firmas digitales)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_logs' AND column_name = 'signatures'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN signatures JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN daily_logs.signatures IS 'Firmas digitales: [{user_id, user_name, user_role, signature_url, signed_at}]';
  END IF;
END $$;

-- =====================================================
-- PARTE 2: CREAR TABLA DAILY_LOG_CONFIGS
-- =====================================================

-- Tabla de configuración de bitácoras
CREATE TABLE IF NOT EXISTS daily_log_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Estado del módulo
  is_enabled BOOLEAN DEFAULT true,
  
  -- Campos personalizados (JSON array)
  -- Estructura: [{ id, name, label, type, required, options, order, placeholder, helpText }]
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
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un solo config por proyecto
  CONSTRAINT daily_log_configs_project_unique UNIQUE(project_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_log_configs_project ON daily_log_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_configs_enabled ON daily_log_configs(is_enabled);

-- RLS
ALTER TABLE daily_log_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Miembros del proyecto pueden ver la configuración
DROP POLICY IF EXISTS "view_daily_log_configs" ON daily_log_configs;
CREATE POLICY "view_daily_log_configs" ON daily_log_configs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_team 
      WHERE project_team.project_id = daily_log_configs.project_id
        AND project_team.user_id = auth.uid()
    )
  );

-- Solo supervisores y admins pueden crear/editar configs
DROP POLICY IF EXISTS "manage_daily_log_configs" ON daily_log_configs;
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
DROP TRIGGER IF EXISTS update_daily_log_configs_updated_at ON daily_log_configs;
CREATE TRIGGER update_daily_log_configs_updated_at
  BEFORE UPDATE ON daily_log_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE daily_log_configs IS 'Configuración de bitácoras por proyecto - campos personalizados y settings';
COMMENT ON COLUMN daily_log_configs.custom_fields IS 'Array de campos personalizados: [{ id, name, label, type, required, options, order }]';
COMMENT ON COLUMN daily_log_configs.custom_checklists IS 'Checklists personalizados adicionales a los default';
COMMENT ON COLUMN daily_log_configs.settings IS 'Configuración general: fotos requeridas, firmas, GPS, etc.';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Mostrar estructura de daily_logs
SELECT 
  'daily_logs' as tabla,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_logs'
  AND column_name IN ('time', 'assigned_to', 'location', 'signatures')
ORDER BY column_name;

-- Mostrar que daily_log_configs fue creada
SELECT 
  'daily_log_configs' as tabla,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_log_configs'
ORDER BY ordinal_position;
