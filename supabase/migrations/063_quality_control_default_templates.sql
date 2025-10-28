-- =====================================================
-- MIGRACIÓN 063: TEMPLATES POR DEFECTO DE CONTROL DE CALIDAD
-- =====================================================

-- 1. Template para Control de Resistencia de Concreto
INSERT INTO quality_control_templates (
  is_global,
  template_name,
  template_type,
  description,
  custom_fields,
  test_configuration,
  validation_rules
) VALUES (
  true, -- Global
  'Control de Resistencia de Concreto',
  'concrete',
  'Control de resistencia a la compresión de concreto según NSR-10',
  -- Campos personalizados
  '[
    {
      "name": "elemento_vaciado",
      "type": "text",
      "label": "Elemento Vaciado",
      "placeholder": "Ej: PILAS CIMENTACION TUBERIA 2 -4- C",
      "required": true
    },
    {
      "name": "resistencia_esperada",
      "type": "number",
      "label": "Resistencia Esperada (PSI)",
      "unit": "PSI",
      "required": true,
      "options": [210, 245, 280, 350, 420, 3000]
    },
    {
      "name": "cantidad_cilindros",
      "type": "number",
      "label": "Cantidad de Cilindros",
      "default": 3,
      "min": 1,
      "max": 10
    },
    {
      "name": "proveedor",
      "type": "text",
      "label": "Proveedor de Concreto"
    },
    {
      "name": "volumen_vaciado",
      "type": "number",
      "label": "Volumen Vaciado (m³)",
      "unit": "m³"
    },
    {
      "name": "slump",
      "type": "number",
      "label": "Slump (cm)",
      "unit": "cm"
    }
  ]'::jsonb,
  -- Configuración de ensayos
  '{
    "test_name": "Ensayo a compresión",
    "test_periods": [3, 7, 14, 28],
    "test_periods_labels": {
      "3": "3 días",
      "7": "7 días", 
      "14": "14 días",
      "28": "28 días"
    },
    "samples_per_test": 3,
    "acceptance_criteria": {
      "min_percentage_3d": 40,
      "min_percentage_7d": 65,
      "min_percentage_14d": 85,
      "min_percentage_28d": 100,
      "max_deviation": 15
    },
    "units": "PSI"
  }'::jsonb,
  -- Reglas de validación
  '[
    {
      "test_period": 3,
      "rule": "average >= expected * 0.40",
      "message": "No cumple resistencia mínima a 3 días (40%)"
    },
    {
      "test_period": 7,
      "rule": "average >= expected * 0.65",
      "message": "No cumple resistencia mínima a 7 días (65%)"
    },
    {
      "test_period": 14,
      "rule": "average >= expected * 0.85",
      "message": "No cumple resistencia mínima a 14 días (85%)"
    },
    {
      "test_period": 28,
      "rule": "average >= expected * 1.00",
      "message": "No cumple resistencia mínima a 28 días (100%)"
    }
  ]'::jsonb
)
ON CONFLICT (template_name) DO NOTHING;

-- 2. Template para Control de Acero de Refuerzo
INSERT INTO quality_control_templates (
  is_global,
  template_name,
  template_type,
  description,
  custom_fields,
  test_configuration,
  validation_rules
) VALUES (
  true,
  'Control de Acero de Refuerzo',
  'steel',
  'Control de calidad de acero de refuerzo según NSR-10',
  '[
    {
      "name": "diametro",
      "type": "select",
      "label": "Diámetro",
      "options": ["#2", "#3", "#4", "#5", "#6", "#7", "#8"],
      "required": true
    },
    {
      "name": "grado",
      "type": "select",
      "label": "Grado",
      "options": ["Grado 40", "Grado 60"],
      "required": true
    },
    {
      "name": "proveedor",
      "type": "text",
      "label": "Proveedor"
    },
    {
      "name": "lote",
      "type": "text",
      "label": "Número de Lote"
    },
    {
      "name": "cantidad",
      "type": "number",
      "label": "Cantidad (kg)",
      "unit": "kg"
    }
  ]'::jsonb,
  '{
    "test_name": "Ensayo de tracción",
    "test_periods": [0],
    "samples_per_test": 3,
    "acceptance_criteria": {
      "min_yield_strength": 40000,
      "min_tensile_strength": 60000,
      "min_elongation": 12
    },
    "units": "PSI"
  }'::jsonb,
  '[
    {
      "rule": "yield_strength >= 40000",
      "message": "No cumple límite de fluencia mínimo"
    },
    {
      "rule": "tensile_strength >= 60000",
      "message": "No cumple resistencia a la tensión mínima"
    },
    {
      "rule": "elongation >= 12",
      "message": "No cumple elongación mínima"
    }
  ]'::jsonb
)
ON CONFLICT (template_name) DO NOTHING;

-- 3. Template para Control de Suelos
INSERT INTO quality_control_templates (
  is_global,
  template_name,
  template_type,
  description,
  custom_fields,
  test_configuration,
  validation_rules
) VALUES (
  true,
  'Control de Compactación de Suelos',
  'soil',
  'Control de compactación de suelos según normas INVIAS',
  '[
    {
      "name": "capa",
      "type": "text",
      "label": "Capa / Nivel",
      "required": true
    },
    {
      "name": "abscisa",
      "type": "text",
      "label": "Abscisa"
    },
    {
      "name": "profundidad",
      "type": "number",
      "label": "Profundidad (m)",
      "unit": "m"
    },
    {
      "name": "tipo_suelo",
      "type": "select",
      "label": "Tipo de Suelo",
      "options": ["Arcilla", "Arena", "Limo", "Grava", "Mixto"]
    },
    {
      "name": "densidad_maxima",
      "type": "number",
      "label": "Densidad Máxima (g/cm³)",
      "unit": "g/cm³"
    },
    {
      "name": "humedad_optima",
      "type": "number",
      "label": "Humedad Óptima (%)",
      "unit": "%"
    }
  ]'::jsonb,
  '{
    "test_name": "Ensayo de densidad in situ",
    "test_periods": [0],
    "samples_per_test": 1,
    "acceptance_criteria": {
      "min_compaction_percentage": 95,
      "max_humidity_deviation": 2
    },
    "units": "%"
  }'::jsonb,
  '[
    {
      "rule": "compaction_percentage >= 95",
      "message": "No cumple grado de compactación mínimo (95%)"
    },
    {
      "rule": "abs(humidity - optimal_humidity) <= 2",
      "message": "Humedad fuera del rango permitido (±2%)"
    }
  ]'::jsonb
)
ON CONFLICT (template_name) DO NOTHING;

-- 4. Verificar templates creados
SELECT 
  template_name,
  template_type,
  is_global,
  jsonb_array_length(custom_fields) as num_fields,
  test_configuration->>'test_name' as test_name
FROM quality_control_templates
WHERE is_global = true
ORDER BY template_type, template_name;
