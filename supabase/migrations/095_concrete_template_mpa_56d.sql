-- =====================================================
-- MIGRACIÓN 095: CONCRETO EN MPa Y EDAD DE 56 DÍAS
-- =====================================================
-- Feedback de supervisión (Santiago Gil):
-- 1. La resistencia esperada y los resultados se manejan en MPa,
--    no en PSI. Resistencias usadas: 17.5, 21, 24.5, 28, 32, 35, 42, 49.
-- 2. Se agrega la edad de 56 días (100% de la resistencia). La norma
--    obliga el resultado a 28 días, pero si no es satisfactorio se
--    fallan cilindros a 56 días para la liberación del elemento, por
--    eso el ensayo de 56 días queda programado siempre pero es opcional
--    (no bloquea el cierre de la muestra si no se usa).

BEGIN;

UPDATE public.quality_control_templates
SET
  custom_fields = '[
    {
      "name": "elemento_vaciado",
      "type": "text",
      "label": "Elemento Vaciado",
      "required": true,
      "placeholder": "Ej: PILAS CIMENTACION TUBERIA 2 -4- C"
    },
    {
      "name": "resistencia_esperada",
      "type": "select",
      "label": "Resistencia Esperada (MPa)",
      "required": true,
      "options": ["17.5", "21", "24.5", "28", "32", "35", "42", "49"],
      "unit": "MPa"
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
  test_configuration = '{
    "test_name": "Ensayo a compresión",
    "test_periods": [3, 7, 14, 28, 56],
    "test_periods_labels": {
      "3": "3 días",
      "7": "7 días",
      "14": "14 días",
      "28": "28 días",
      "56": "56 días"
    },
    "optional_periods": [56],
    "samples_per_test": 3,
    "units": "MPa",
    "acceptance_criteria": {
      "min_percentage_3d": 40,
      "min_percentage_7d": 65,
      "min_percentage_14d": 85,
      "min_percentage_28d": 100,
      "min_percentage_56d": 100,
      "max_deviation": 15
    }
  }'::jsonb,
  validation_rules = '[
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
    },
    {
      "test_period": 56,
      "rule": "average >= expected * 1.00",
      "message": "No cumple resistencia mínima a 56 días (100%)"
    }
  ]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'concrete'
  AND template_name = 'Control de Resistencia de Concreto';

COMMIT;
