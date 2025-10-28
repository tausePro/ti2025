-- =====================================================
-- MIGRACIÓN 062: SISTEMA DE CONTROL DE CALIDAD
-- =====================================================
-- Sistema dinámico y configurable para control de calidad
-- (concreto, acero, suelos, etc.)

-- 1. Tabla de plantillas de control de calidad
CREATE TABLE IF NOT EXISTS quality_control_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información básica
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'concrete', 'steel', 'soil', 'custom'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false, -- Si es plantilla global (visible para todos)
  
  -- Configuración de campos personalizados
  custom_fields JSONB DEFAULT '[]'::jsonb,
  -- Ejemplo: [
  --   {"name": "elemento_vaciado", "type": "text", "label": "Elemento Vaciado", "required": true},
  --   {"name": "resistencia_esperada", "type": "number", "label": "Resistencia Esperada (PSI)", "unit": "PSI"}
  -- ]
  
  -- Configuración de ensayos
  test_configuration JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {
  --   "test_periods": [3, 7, 14, 28],
  --   "samples_per_test": 3,
  --   "acceptance_criteria": {
  --     "min_percentage": 85,
  --     "max_deviation": 15
  --   }
  -- }
  
  -- Configuración de validaciones
  validation_rules JSONB DEFAULT '[]'::jsonb,
  -- Ejemplo: [
  --   {"field": "resultado", "operator": ">=", "value": "resistencia_esperada * 0.85", "message": "No cumple resistencia mínima"}
  -- ]
  
  -- Metadatos
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(template_name)
);

-- 2. Tabla de muestras de control de calidad
CREATE TABLE IF NOT EXISTS quality_control_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES quality_control_templates(id) ON DELETE RESTRICT,
  
  -- Identificación
  sample_number TEXT NOT NULL, -- Número de muestra (ej: "342", "348")
  sample_code TEXT, -- Código completo (ej: "CONC-2024-342")
  
  -- Datos básicos
  sample_date DATE NOT NULL, -- Fecha de toma de muestra / vaciado
  location TEXT, -- Ubicación en obra
  
  -- Datos personalizados (según template)
  custom_data JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {
  --   "elemento_vaciado": "PILAS CIMENTACION TUBERIA 2 -4- C",
  --   "resistencia_esperada": 3000,
  --   "cantidad_cilindros": 3
  -- }
  
  -- Estado general
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'approved')),
  overall_result TEXT, -- 'CUMPLE', 'NO CUMPLE', 'ENVIAR TESTIGOS'
  
  -- Observaciones
  notes TEXT,
  
  -- Metadatos
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(project_id, sample_number)
);

-- 3. Tabla de ensayos programados
CREATE TABLE IF NOT EXISTS quality_control_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES quality_control_samples(id) ON DELETE CASCADE,
  
  -- Información del ensayo
  test_name TEXT NOT NULL, -- 'Ensayo a compresión', 'Ensayo de tracción', etc.
  test_period INTEGER, -- Días después de la muestra (3, 7, 14, 28)
  test_date DATE NOT NULL, -- Fecha programada del ensayo
  actual_test_date DATE, -- Fecha real del ensayo
  
  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Configuración específica del ensayo
  test_config JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {
  --   "cylinders_count": 3,
  --   "expected_resistance": 3000
  -- }
  
  -- Metadatos
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tabla de resultados de ensayos
CREATE TABLE IF NOT EXISTS quality_control_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES quality_control_tests(id) ON DELETE CASCADE,
  
  -- Resultados individuales (por cilindro/probeta)
  specimen_number INTEGER NOT NULL, -- Número de cilindro/probeta (1, 2, 3)
  result_value DECIMAL(10,2) NOT NULL, -- Valor obtenido (ej: 266.15 PSI)
  
  -- Datos adicionales
  result_data JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {
  --   "diameter": 15,
  --   "height": 30,
  --   "load": 12500,
  --   "area": 176.71
  -- }
  
  -- Validación
  meets_criteria BOOLEAN, -- Si cumple con los criterios
  deviation_percentage DECIMAL(5,2), -- % de desviación
  
  -- Observaciones
  notes TEXT,
  
  -- Metadatos
  tested_by UUID REFERENCES profiles(id),
  tested_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(test_id, specimen_number)
);

-- 5. Índices para optimización
CREATE INDEX idx_qc_templates_type ON quality_control_templates(template_type);
CREATE INDEX idx_qc_templates_global ON quality_control_templates(is_global) WHERE is_global = true;
CREATE INDEX idx_qc_samples_project ON quality_control_samples(project_id);
CREATE INDEX idx_qc_samples_template ON quality_control_samples(template_id);
CREATE INDEX idx_qc_samples_date ON quality_control_samples(sample_date DESC);
CREATE INDEX idx_qc_samples_status ON quality_control_samples(status);
CREATE INDEX idx_qc_tests_sample ON quality_control_tests(sample_id);
CREATE INDEX idx_qc_tests_date ON quality_control_tests(test_date);
CREATE INDEX idx_qc_tests_status ON quality_control_tests(status);
CREATE INDEX idx_qc_results_test ON quality_control_results(test_id);

-- 6. Triggers para updated_at
CREATE TRIGGER update_qc_templates_updated_at
  BEFORE UPDATE ON quality_control_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qc_samples_updated_at
  BEFORE UPDATE ON quality_control_samples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qc_tests_updated_at
  BEFORE UPDATE ON quality_control_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Función para calcular resultado general de muestra
CREATE OR REPLACE FUNCTION calculate_sample_overall_result()
RETURNS TRIGGER AS $$
DECLARE
  total_tests INTEGER;
  completed_tests INTEGER;
  failed_tests INTEGER;
BEGIN
  -- Contar ensayos
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'completed' AND NOT EXISTS (
      SELECT 1 FROM quality_control_results qcr 
      WHERE qcr.test_id = quality_control_tests.id 
      AND qcr.meets_criteria = false
    ))
  INTO total_tests, completed_tests, failed_tests
  FROM quality_control_tests
  WHERE sample_id = NEW.sample_id;
  
  -- Actualizar estado de la muestra
  IF completed_tests = total_tests THEN
    UPDATE quality_control_samples
    SET 
      status = 'completed',
      overall_result = CASE 
        WHEN failed_tests > 0 THEN 'NO CUMPLE'
        ELSE 'CUMPLE'
      END
    WHERE id = NEW.sample_id;
  ELSIF completed_tests > 0 THEN
    UPDATE quality_control_samples
    SET status = 'in_progress'
    WHERE id = NEW.sample_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_sample_result
  AFTER INSERT OR UPDATE ON quality_control_results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sample_overall_result();

-- 8. RLS Policies
ALTER TABLE quality_control_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_control_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_control_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_control_results ENABLE ROW LEVEL SECURITY;

-- Políticas para templates
CREATE POLICY "Users can view templates"
  ON quality_control_templates FOR SELECT
  TO authenticated
  USING (
    is_global = true -- Templates globales visibles para todos
    OR created_by = auth.uid() -- O templates creados por el usuario
  );

CREATE POLICY "Admin can manage templates"
  ON quality_control_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role::user_role IN ('admin', 'super_admin')
    )
  );

-- Políticas para samples
CREATE POLICY "Users can view samples of their projects"
  ON quality_control_samples FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid()
      OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create samples in their projects"
  ON quality_control_samples FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid()
      OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update samples in their projects"
  ON quality_control_samples FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid()
      OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

-- Políticas para tests (heredan de samples)
CREATE POLICY "Users can view tests of accessible samples"
  ON quality_control_tests FOR SELECT
  TO authenticated
  USING (
    sample_id IN (
      SELECT id FROM quality_control_samples
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE created_by = auth.uid()
        OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage tests"
  ON quality_control_tests FOR ALL
  TO authenticated
  USING (
    sample_id IN (
      SELECT id FROM quality_control_samples
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE created_by = auth.uid()
        OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
      )
    )
  );

-- Políticas para results (heredan de tests)
CREATE POLICY "Users can view results of accessible tests"
  ON quality_control_results FOR SELECT
  TO authenticated
  USING (
    test_id IN (
      SELECT qct.id FROM quality_control_tests qct
      JOIN quality_control_samples qcs ON qct.sample_id = qcs.id
      WHERE qcs.project_id IN (
        SELECT id FROM projects 
        WHERE created_by = auth.uid()
        OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage results"
  ON quality_control_results FOR ALL
  TO authenticated
  USING (
    test_id IN (
      SELECT qct.id FROM quality_control_tests qct
      JOIN quality_control_samples qcs ON qct.sample_id = qcs.id
      WHERE qcs.project_id IN (
        SELECT id FROM projects 
        WHERE created_by = auth.uid()
        OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
      )
    )
  );

-- 9. Comentarios
COMMENT ON TABLE quality_control_templates IS 'Plantillas configurables para diferentes tipos de control de calidad';
COMMENT ON TABLE quality_control_samples IS 'Muestras tomadas en obra para control de calidad';
COMMENT ON TABLE quality_control_tests IS 'Ensayos programados para cada muestra';
COMMENT ON TABLE quality_control_results IS 'Resultados individuales de cada ensayo (por cilindro/probeta)';

COMMENT ON COLUMN quality_control_templates.custom_fields IS 'Campos personalizados del formulario de registro';
COMMENT ON COLUMN quality_control_templates.test_configuration IS 'Configuración de períodos de ensayo y criterios de aceptación';
COMMENT ON COLUMN quality_control_samples.custom_data IS 'Datos personalizados según el template';
COMMENT ON COLUMN quality_control_results.meets_criteria IS 'Si el resultado cumple con los criterios de aceptación';
