-- =====================================================
-- MIGRACIÓN 098: PLANTILLAS OLA 1 - MORTEROS Y MAMPOSTERÍA
-- =====================================================
-- Crea 3 plantillas globales nuevas:
--   1. Mortero de pega (NTC-3546): compresión de cubos a 7 y 28 días,
--      evaluado contra resistencia esperada (75% a 7d, 100% a 28d).
--      NOTA: el 75% a 7 días es ajustable tras validación de Santiago Gil.
--   2. Murete de mampostería (NTC-3495): f'm a 28 días contra resistencia esperada.
--   3. Unidad de mampostería (NTC-4205): compresión mínima y absorción máxima
--      tomadas de la especificación del proyecto (las ingresa el residente
--      al crear la muestra; el motor usa value_from).
-- Idempotente: no duplica si ya existen.

-- 1. Mortero de pega
INSERT INTO quality_control_templates (
  is_global,
  template_name,
  template_type,
  description,
  custom_fields,
  test_configuration,
  validation_rules
)
SELECT
  true,
  'Control de Mortero de Pega',
  'mortar',
  'Control de resistencia a compresión de mortero de pega según NTC-3546 (cubos de 50 mm)',
  '[
    {
      "name": "tipo_mortero",
      "type": "select",
      "label": "Tipo de Mortero",
      "options": ["M", "S", "N", "Según diseño"],
      "required": true
    },
    {
      "name": "resistencia_esperada",
      "type": "number",
      "label": "Resistencia Esperada (f''cp)",
      "unit": "MPa",
      "required": true,
      "min": 1,
      "max": 30
    },
    {
      "name": "dosificacion",
      "type": "text",
      "label": "Dosificación"
    },
    {
      "name": "proveedor",
      "type": "text",
      "label": "Proveedor / Preparado en obra"
    }
  ]'::jsonb,
  '{
    "test_name": "Ensayo de compresión de mortero",
    "test_periods": [7, 28],
    "samples_per_test": 3,
    "units": "MPa",
    "specimens_label": "Cubo"
  }'::jsonb,
  '[
    {
      "test_period": 7,
      "rule": "expected * 0.75",
      "message": "La resistencia promedio a 7 días es menor al 75% de la esperada"
    },
    {
      "test_period": 28,
      "rule": "expected * 1.0",
      "message": "La resistencia promedio a 28 días es menor a la esperada"
    }
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM quality_control_templates
  WHERE template_type = 'mortar' AND is_global = true
);

-- 2. Murete de mampostería
INSERT INTO quality_control_templates (
  is_global,
  template_name,
  template_type,
  description,
  custom_fields,
  test_configuration,
  validation_rules
)
SELECT
  true,
  'Control de Muretes de Mampostería',
  'masonry_prism',
  'Control de resistencia a compresión de muretes (prismas) de mampostería según NTC-3495 (f''m)',
  '[
    {
      "name": "tipo_unidad",
      "type": "select",
      "label": "Tipo de Unidad",
      "options": ["Arcilla", "Concreto"],
      "required": true
    },
    {
      "name": "resistencia_esperada",
      "type": "number",
      "label": "Resistencia Esperada (f''m)",
      "unit": "MPa",
      "required": true,
      "min": 1,
      "max": 40
    },
    {
      "name": "mortero_utilizado",
      "type": "text",
      "label": "Mortero Utilizado"
    },
    {
      "name": "proveedor",
      "type": "text",
      "label": "Proveedor de Unidades"
    }
  ]'::jsonb,
  '{
    "test_name": "Ensayo de compresión de murete",
    "test_periods": [28],
    "samples_per_test": 3,
    "units": "MPa",
    "specimens_label": "Murete"
  }'::jsonb,
  '[
    {
      "test_period": 28,
      "rule": "expected * 1.0",
      "message": "La resistencia promedio a 28 días es menor a f''m especificado"
    }
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM quality_control_templates
  WHERE template_type = 'masonry_prism' AND is_global = true
);

-- 3. Unidad de mampostería
INSERT INTO quality_control_templates (
  is_global,
  template_name,
  template_type,
  description,
  custom_fields,
  test_configuration,
  validation_rules
)
SELECT
  true,
  'Control de Unidades de Mampostería',
  'masonry_unit',
  'Control de resistencia a compresión y absorción de agua de unidades de mampostería según NTC-4205. Los límites se toman de la especificación del proyecto.',
  '[
    {
      "name": "tipo_unidad",
      "type": "select",
      "label": "Tipo de Unidad",
      "options": ["Bloque de arcilla", "Ladrillo de arcilla", "Bloque de concreto", "Ladrillo de concreto"],
      "required": true
    },
    {
      "name": "uso",
      "type": "select",
      "label": "Uso",
      "options": ["Estructural", "No estructural"],
      "required": true
    },
    {
      "name": "resistencia_minima",
      "type": "number",
      "label": "Resistencia Mínima Especificada",
      "unit": "MPa",
      "required": true,
      "min": 1,
      "max": 50
    },
    {
      "name": "absorcion_maxima",
      "type": "number",
      "label": "Absorción Máxima Especificada",
      "unit": "%",
      "required": true,
      "min": 1,
      "max": 30
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
    }
  ]'::jsonb,
  '{
    "test_name": "Ensayo de unidades de mampostería",
    "units": "MPa",
    "specimens_label": "Unidad",
    "named_tests": [
      {
        "key": "unidades",
        "name": "Ensayo de compresión y absorción",
        "period": 0,
        "samples_per_test": 5,
        "specimens_label": "Unidad",
        "metrics": [
          {
            "key": "compresion",
            "label": "Resistencia a la compresión",
            "unit": "MPa",
            "criteria": [
              {
                "operator": ">=",
                "value_from": "resistencia_minima",
                "message": "Resistencia menor a la mínima especificada para el proyecto"
              }
            ]
          },
          {
            "key": "absorcion",
            "label": "Absorción de agua",
            "unit": "%",
            "criteria": [
              {
                "operator": "<=",
                "value_from": "absorcion_maxima",
                "message": "Absorción mayor a la máxima especificada para el proyecto"
              }
            ]
          }
        ]
      }
    ]
  }'::jsonb,
  '[]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM quality_control_templates
  WHERE template_type = 'masonry_unit' AND is_global = true
);

-- Verificación
SELECT
  template_name,
  template_type,
  jsonb_array_length(custom_fields) AS num_fields,
  test_configuration->>'units' AS units
FROM quality_control_templates
WHERE is_global = true
  AND template_type IN ('mortar', 'masonry_prism', 'masonry_unit')
ORDER BY template_type;
