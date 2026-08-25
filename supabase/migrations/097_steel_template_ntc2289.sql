-- =====================================================
-- MIGRACIÓN 097: PLANTILLA DE ACERO DE REFUERZO NTC-2289 / NTC-5806
-- =====================================================
-- Rediseña "Control de Acero de Refuerzo":
--   - Unidades en MPa (antes PSI)
--   - Ensayos nombrados multi-métrica (named_tests):
--       * Ensayo físico de tracción: fluencia (rango 420-540 barra / >=485 malla),
--         tracción (>=550), relación tracción/fluencia (calculada, >=1.25 barra),
--         alargamiento (>=14% para #2-#6, >=12% para #7-#10)
--       * Análisis químico de colada (opcional): máximos C 0.33, Mn 1.56,
--         P 0.043, S 0.053, Si 0.55 (%)
--   - Campo tipo_producto: Barra corrugada / Malla electrosoldada (NTC-5806)
--   - Diámetros hasta #10 y campo de colada

UPDATE quality_control_templates
SET
  description = 'Control de calidad de acero de refuerzo según NTC-2289 (barras corrugadas de baja aleación) y NTC-5806 (mallas electrosoldadas)',
  custom_fields = '[
    {
      "name": "tipo_producto",
      "type": "select",
      "label": "Tipo de Producto",
      "options": ["Barra corrugada", "Malla electrosoldada"],
      "default": "Barra corrugada",
      "required": true
    },
    {
      "name": "diametro",
      "type": "select",
      "label": "Diámetro",
      "options": ["#2", "#3", "#4", "#5", "#6", "#7", "#8", "#9", "#10"],
      "required": true
    },
    {
      "name": "grado",
      "type": "select",
      "label": "Grado",
      "options": ["Grado 60 (420 MPa)"],
      "default": "Grado 60 (420 MPa)",
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
      "name": "colada",
      "type": "text",
      "label": "Número de Colada"
    },
    {
      "name": "cantidad",
      "type": "number",
      "label": "Cantidad (kg)",
      "unit": "kg"
    }
  ]'::jsonb,
  test_configuration = '{
    "test_name": "Ensayo de acero de refuerzo",
    "units": "MPa",
    "specimens_label": "Probeta",
    "named_tests": [
      {
        "key": "fisico",
        "name": "Ensayo físico de tracción",
        "period": 0,
        "samples_per_test": 1,
        "specimens_label": "Probeta",
        "metrics": [
          {
            "key": "fluencia",
            "label": "Límite de fluencia (fy)",
            "unit": "MPa",
            "criteria": [
              {
                "operator": "range",
                "min": 420,
                "max": 540,
                "when": {"tipo_producto": ["Barra corrugada"]},
                "message": "Fluencia fuera del rango 420-540 MPa exigido por NTC-2289"
              },
              {
                "operator": ">=",
                "value": 485,
                "when": {"tipo_producto": ["Malla electrosoldada"]},
                "message": "Fluencia menor a 485 MPa exigido por NTC-5806"
              }
            ]
          },
          {
            "key": "traccion",
            "label": "Resistencia a la tracción (fu)",
            "unit": "MPa",
            "criteria": [
              {
                "operator": ">=",
                "value": 550,
                "message": "Resistencia a la tracción menor a 550 MPa"
              }
            ]
          },
          {
            "key": "relacion",
            "label": "Relación fu/fy",
            "unit": "",
            "computed": "ratio:traccion/fluencia",
            "decimals": 2,
            "criteria": [
              {
                "operator": ">=",
                "value": 1.25,
                "when": {"tipo_producto": ["Barra corrugada"]},
                "message": "Relación tracción/fluencia menor a 1.25 exigida por NTC-2289"
              }
            ]
          },
          {
            "key": "alargamiento",
            "label": "Alargamiento en 200 mm",
            "unit": "%",
            "criteria": [
              {
                "operator": ">=",
                "value": 14,
                "when": {"tipo_producto": ["Barra corrugada"], "diametro": ["#2", "#3", "#4", "#5", "#6"]},
                "message": "Alargamiento menor al 14% exigido para barras #2 a #6"
              },
              {
                "operator": ">=",
                "value": 12,
                "when": {"tipo_producto": ["Barra corrugada"], "diametro": ["#7", "#8", "#9", "#10"]},
                "message": "Alargamiento menor al 12% exigido para barras #7 a #10"
              }
            ]
          }
        ]
      },
      {
        "key": "quimico",
        "name": "Análisis químico de colada",
        "period": 0,
        "optional": true,
        "samples_per_test": 1,
        "specimens_label": "Colada",
        "metrics": [
          {
            "key": "carbono",
            "label": "Carbono (C)",
            "unit": "%",
            "criteria": [{"operator": "<=", "value": 0.33, "message": "Carbono mayor al máximo de 0.33%"}]
          },
          {
            "key": "manganeso",
            "label": "Manganeso (Mn)",
            "unit": "%",
            "criteria": [{"operator": "<=", "value": 1.56, "message": "Manganeso mayor al máximo de 1.56%"}]
          },
          {
            "key": "fosforo",
            "label": "Fósforo (P)",
            "unit": "%",
            "criteria": [{"operator": "<=", "value": 0.043, "message": "Fósforo mayor al máximo de 0.043%"}]
          },
          {
            "key": "azufre",
            "label": "Azufre (S)",
            "unit": "%",
            "criteria": [{"operator": "<=", "value": 0.053, "message": "Azufre mayor al máximo de 0.053%"}]
          },
          {
            "key": "silicio",
            "label": "Silicio (Si)",
            "unit": "%",
            "criteria": [{"operator": "<=", "value": 0.55, "message": "Silicio mayor al máximo de 0.55%"}]
          }
        ]
      }
    ]
  }'::jsonb,
  validation_rules = '[]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'steel'
  AND is_global = true;

-- Verificación
SELECT
  template_name,
  test_configuration->>'units' AS units,
  jsonb_array_length(test_configuration->'named_tests') AS named_tests,
  jsonb_array_length(custom_fields) AS num_fields
FROM quality_control_templates
WHERE template_type = 'steel'
  AND is_global = true;
