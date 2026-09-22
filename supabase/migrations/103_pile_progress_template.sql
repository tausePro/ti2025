-- =====================================================
-- MIGRACIÓN 103: OLA 3 - AVANCE DE PILAS (VOLUMEN TEÓRICO VS REAL)
-- =====================================================
-- Según lo confirmado con Santiago Gil: se compara el volumen m³ teórico
-- de la pila con el volumen m³ real de concreto colocado.
-- Decisiones (Felipe, 2026-09-16):
--   - Una muestra = una pila (el número de muestra es la identificación de la pila).
--   - Volumen teórico calculado como π·D²/4·L desde diámetro y profundidad de
--     diseño, editable por el residente (ej. pilas con campana).
--   - No se admite subconsumo (volumen real menor al teórico).
--   - Sobreconsumo máximo admisible configurable por pila, 10 % por defecto.
-- La variación se calcula con la métrica pct_diff:volumen_real/volumen_teorico
-- (el volumen teórico se toma de los datos de la muestra) y cumple si está en
-- el rango 0 – sobreconsumo_maximo.
-- Idempotente: no duplica si ya existe.

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
  'Control de Avance de Pilas',
  'pile_progress',
  'Control de vaciado de pilas de cimentación: compara el volumen teórico de diseño (π·D²/4·L, ajustable) con el volumen real de concreto colocado. Una muestra por pila. No se admite subconsumo y el sobreconsumo no debe superar el máximo especificado para el proyecto.',
  '[
    {
      "name": "diametro",
      "type": "number",
      "label": "Diámetro de Diseño",
      "unit": "m",
      "required": true,
      "min": 0.1,
      "max": 5
    },
    {
      "name": "profundidad",
      "type": "number",
      "label": "Profundidad de Diseño",
      "unit": "m",
      "required": true,
      "min": 0.5,
      "max": 80
    },
    {
      "name": "volumen_teorico",
      "type": "number",
      "label": "Volumen Teórico",
      "unit": "m³",
      "required": true,
      "min": 0.01,
      "decimals": 2,
      "computed": "cylinder_volume:diametro/profundidad",
      "help": "Se calcula automáticamente como π·D²/4·L a partir del diámetro y la profundidad. Ajústalo si la pila tiene campana u otra geometría."
    },
    {
      "name": "sobreconsumo_maximo",
      "type": "number",
      "label": "Sobreconsumo Máximo Admisible",
      "unit": "%",
      "required": true,
      "default": 10,
      "min": 0,
      "max": 100,
      "help": "Porcentaje de volumen adicional sobre el teórico que admite la especificación del proyecto."
    }
  ]'::jsonb,
  '{
    "test_name": "Vaciado de pila",
    "units": "m³",
    "specimens_label": "Pila",
    "sample_number_label": "Identificación de la Pila",
    "sample_number_placeholder": "Ej: P-12",
    "named_tests": [
      {
        "key": "vaciado",
        "name": "Vaciado de pila",
        "period": 0,
        "samples_per_test": 1,
        "specimens_label": "Pila",
        "metrics": [
          {
            "key": "volumen_real",
            "label": "Volumen real de concreto",
            "unit": "m³"
          },
          {
            "key": "profundidad_real",
            "label": "Profundidad real excavada",
            "unit": "m"
          },
          {
            "key": "variacion",
            "label": "Variación de volumen (real vs teórico)",
            "unit": "%",
            "computed": "pct_diff:volumen_real/volumen_teorico",
            "decimals": 2,
            "criteria": [
              {
                "operator": "range",
                "min": 0,
                "max_from": "sobreconsumo_maximo",
                "message": "Volumen fuera del rango admisible: no se admite subconsumo (volumen real menor al teórico) y el sobreconsumo no debe superar el máximo especificado para el proyecto"
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
  WHERE template_type = 'pile_progress' AND is_global = true
);

-- Verificación
SELECT template_name, template_type,
  jsonb_array_length(custom_fields) AS num_fields,
  custom_fields->2->>'computed' AS volumen_teorico_formula,
  test_configuration->'named_tests'->0->'metrics'->2->>'computed' AS variacion_formula
FROM quality_control_templates
WHERE template_type = 'pile_progress'
  AND is_global = true;
