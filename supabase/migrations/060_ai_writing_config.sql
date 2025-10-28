-- =====================================================
-- MIGRACIÓN 060: CONFIGURACIÓN DE IA PARA INFORMES
-- =====================================================
-- Tabla para entrenar cómo escribe la IA en los informes

-- 1. Tabla de configuración de escritura de IA
CREATE TABLE IF NOT EXISTS ai_writing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuración general
  config_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false, -- Si es configuración global (visible para todos)
  
  -- Estilo de escritura
  tone TEXT NOT NULL DEFAULT 'formal' CHECK (tone IN ('formal', 'tecnico', 'ejecutivo', 'casual')),
  language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  
  -- Instrucciones para la IA
  system_prompt TEXT NOT NULL DEFAULT 'Eres un asistente especializado en redacción de informes técnicos de construcción e interventoría.',
  writing_guidelines TEXT, -- Guías específicas de cómo escribir
  
  -- Ejemplos de escritura (para few-shot learning)
  example_texts JSONB DEFAULT '[]'::jsonb, -- Array de ejemplos: [{"input": "...", "output": "..."}]
  
  -- Configuración por sección
  section_prompts JSONB DEFAULT '{}'::jsonb, -- Prompts específicos por sección
  
  -- Vocabulario y terminología
  preferred_terms JSONB DEFAULT '{}'::jsonb, -- {"término_genérico": "término_preferido"}
  avoid_terms TEXT[], -- Términos a evitar
  
  -- Configuración de generación
  max_tokens INTEGER DEFAULT 500,
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  
  -- Metadatos
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(config_name)
);

-- 2. Índices
CREATE INDEX idx_ai_writing_config_global ON ai_writing_config(is_global) WHERE is_global = true;
CREATE INDEX idx_ai_writing_config_active ON ai_writing_config(is_active) WHERE is_active = true;

-- 3. Trigger para updated_at
CREATE TRIGGER update_ai_writing_config_updated_at
  BEFORE UPDATE ON ai_writing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Configuración por defecto
INSERT INTO ai_writing_config (
  is_global,
  config_name,
  tone,
  system_prompt,
  writing_guidelines,
  section_prompts
) VALUES (
  true, -- Global
  'Configuración Estándar',
  'formal',
  'Eres un asistente especializado en redacción de informes técnicos de construcción e interventoría. Escribe de forma clara, precisa y profesional.',
  E'- Usa lenguaje técnico apropiado\n- Sé conciso pero completo\n- Incluye datos específicos cuando estén disponibles\n- Mantén un tono profesional\n- Estructura la información de forma lógica',
  '{
    "executive_summary": "Resume los puntos más importantes del período en máximo 3 párrafos. Enfócate en logros, desafíos y próximos pasos.",
    "progress_status": "Describe el avance de obra de forma cuantitativa y cualitativa. Incluye porcentajes, hitos alcanzados y desviaciones.",
    "technical_supervision": "Detalla las actividades de supervisión técnica realizadas, hallazgos y recomendaciones.",
    "recommendations": "Proporciona recomendaciones específicas y accionables basadas en los hallazgos del período."
  }'::jsonb
)
ON CONFLICT (config_name) DO NOTHING;

-- 5. RLS
ALTER TABLE ai_writing_config ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Ver configuraciones globales o propias
CREATE POLICY "Usuarios pueden ver configuraciones de IA"
  ON ai_writing_config
  FOR SELECT
  TO authenticated
  USING (
    is_global = true -- Configuraciones globales
    OR
    created_by = auth.uid() -- O configuraciones propias
  );

-- Política INSERT: Solo admin y super_admin
CREATE POLICY "Admin puede crear configuraciones de IA"
  ON ai_writing_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::user_role IN ('admin', 'super_admin')
    )
  );

-- Política UPDATE: Solo admin y super_admin
CREATE POLICY "Admin puede actualizar configuraciones de IA"
  ON ai_writing_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::user_role IN ('admin', 'super_admin')
    )
  );

-- Política DELETE: Solo super_admin
CREATE POLICY "Super admin puede eliminar configuraciones de IA"
  ON ai_writing_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::user_role = 'super_admin'
    )
  );

-- 6. Comentarios
COMMENT ON TABLE ai_writing_config IS 'Configuración de cómo la IA escribe en los informes - Permite entrenar el estilo de escritura';
COMMENT ON COLUMN ai_writing_config.tone IS 'Tono de escritura: formal, tecnico, ejecutivo, casual';
COMMENT ON COLUMN ai_writing_config.system_prompt IS 'Prompt del sistema para la IA';
COMMENT ON COLUMN ai_writing_config.example_texts IS 'Ejemplos de escritura para few-shot learning';
COMMENT ON COLUMN ai_writing_config.section_prompts IS 'Prompts específicos por cada sección del informe';
COMMENT ON COLUMN ai_writing_config.preferred_terms IS 'Diccionario de términos preferidos vs genéricos';
