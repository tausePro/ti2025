-- =====================================================
-- MIGRACIÓN 072: Configuración de IA desde Admin
-- =====================================================
-- Permite al super_admin configurar API keys y settings de IA

-- 1. Tabla de configuración de IA
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Proveedor de IA
  provider VARCHAR(50) NOT NULL DEFAULT 'openai', -- 'openai', 'anthropic', 'google'
  
  -- API Keys (encriptadas)
  api_key TEXT, -- Se guardará encriptada
  api_key_last_4 VARCHAR(4), -- Últimos 4 caracteres para mostrar
  
  -- Configuración del modelo
  model_name VARCHAR(100) DEFAULT 'gpt-4o',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  
  -- Configuración de uso
  is_active BOOLEAN DEFAULT true,
  daily_token_limit INTEGER DEFAULT 100000,
  tokens_used_today INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Prompts del sistema
  system_prompt TEXT DEFAULT 'Eres un ingeniero civil experto en redacción de informes técnicos de interventoría. Escribe de forma profesional, técnica y detallada.',
  
  -- Metadatos
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único parcial para solo una configuración activa por proveedor
CREATE UNIQUE INDEX idx_ai_settings_active_provider 
  ON ai_settings(provider) 
  WHERE is_active = true;

-- 2. Tabla de historial de uso de IA
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia
  ai_setting_id UUID REFERENCES ai_settings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  
  -- Contexto de uso
  feature VARCHAR(100), -- 'biweekly_report', 'daily_log', 'document_summary'
  entity_type VARCHAR(50), -- 'report', 'section', 'log'
  entity_id UUID,
  
  -- Uso
  model_used VARCHAR(100),
  tokens_prompt INTEGER,
  tokens_completion INTEGER,
  tokens_total INTEGER,
  
  -- Costo estimado (en USD)
  estimated_cost DECIMAL(10,6),
  
  -- Resultado
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Función para obtener API key activa (solo para backend)
CREATE OR REPLACE FUNCTION get_active_ai_api_key(p_provider VARCHAR DEFAULT 'openai')
RETURNS TEXT AS $$
DECLARE
  v_api_key TEXT;
BEGIN
  SELECT api_key INTO v_api_key
  FROM ai_settings
  WHERE provider = p_provider
    AND is_active = true
  LIMIT 1;
  
  RETURN v_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para registrar uso de IA
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_feature VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_tokens_total INTEGER,
  p_model VARCHAR DEFAULT 'gpt-4o'
)
RETURNS VOID AS $$
DECLARE
  v_setting_id UUID;
  v_cost DECIMAL(10,6);
BEGIN
  -- Obtener configuración activa
  SELECT id INTO v_setting_id
  FROM ai_settings
  WHERE is_active = true
  LIMIT 1;
  
  -- Calcular costo estimado (GPT-4o: $0.005 per 1K tokens input, $0.015 per 1K tokens output)
  -- Simplificado: promedio de $0.01 per 1K tokens
  v_cost := (p_tokens_total / 1000.0) * 0.01;
  
  -- Insertar log
  INSERT INTO ai_usage_logs (
    ai_setting_id,
    user_id,
    feature,
    entity_type,
    entity_id,
    model_used,
    tokens_total,
    estimated_cost,
    success
  ) VALUES (
    v_setting_id,
    p_user_id,
    p_feature,
    p_entity_type,
    p_entity_id,
    p_model,
    p_tokens_total,
    v_cost,
    true
  );
  
  -- Actualizar contador diario
  UPDATE ai_settings
  SET tokens_used_today = tokens_used_today + p_tokens_total,
      updated_at = NOW()
  WHERE id = v_setting_id;
  
  -- Reset contador si es un nuevo día
  UPDATE ai_settings
  SET tokens_used_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para verificar límite diario
CREATE OR REPLACE FUNCTION check_ai_daily_limit()
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT daily_token_limit, tokens_used_today
  INTO v_limit, v_used
  FROM ai_settings
  WHERE is_active = true
  LIMIT 1;
  
  IF v_used >= v_limit THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature);

-- 7. RLS Policies
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Solo super_admin puede ver configuración
DROP POLICY IF EXISTS "Super admin can view AI settings" ON ai_settings;
CREATE POLICY "Super admin can view AI settings"
  ON ai_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

-- Solo super_admin puede modificar configuración
DROP POLICY IF EXISTS "Super admin can manage AI settings" ON ai_settings;
CREATE POLICY "Super admin can manage AI settings"
  ON ai_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

-- Usuarios pueden ver su propio uso
DROP POLICY IF EXISTS "Users can view their AI usage" ON ai_usage_logs;
CREATE POLICY "Users can view their AI usage"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 8. Comentarios
COMMENT ON TABLE ai_settings IS 'Configuración de API keys y settings de IA - Solo accesible por super_admin';
COMMENT ON TABLE ai_usage_logs IS 'Historial de uso de IA para tracking de costos y límites';
COMMENT ON FUNCTION get_active_ai_api_key IS 'Obtiene la API key activa - Solo para uso en backend';
COMMENT ON FUNCTION log_ai_usage IS 'Registra el uso de IA y actualiza contadores';
COMMENT ON FUNCTION check_ai_daily_limit IS 'Verifica si se ha alcanzado el límite diario de tokens';
