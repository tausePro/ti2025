-- =====================================================
-- MIGRACIÓN 102: OLA 2 - PRESURIZACIONES Y ESTANQUEIDAD
-- =====================================================
-- Según formato de Santiago Gil (audio 2026-09-03):
--   - Se registra presión inicial, presión final y duración de la prueba.
--   - Criterio de aceptación: NO se admite NINGUNA caída de presión
--     (la lectura a las 24 horas debe dar lo mismo que la inicial).
--   - Evidencia: foto del manómetro al inicio y otra al final.
-- Se crean 2 plantillas globales:
--   1. Presurización de redes (agua fría/caliente/gas) - PSI/bar
--   2. Prueba de estanqueidad (nivel de agua constante) - cm
-- La caída se calcula con la métrica diff:inicial/final y cumple si <= 0.
-- Además: bucket de storage para fotos de resultados de calidad.
-- Idempotente: no duplica si ya existen.

-- 1. Presurización de redes
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
  'Prueba de Presurización de Redes',
  'pressurization',
  'Prueba de presurización de redes hidráulicas y de gas: la presión inicial debe mantenerse sin ninguna caída durante la prueba (típicamente 24 horas). Registrar foto del manómetro al inicio y al final.',
  '[
    {
      "name": "tipo_red",
      "type": "select",
      "label": "Tipo de Red",
      "options": ["Agua fría", "Agua caliente", "Gas", "Red contra incendio"],
      "required": true
    },
    {
      "name": "unidad_presion",
      "type": "select",
      "label": "Unidad de Presión",
      "options": ["PSI", "bar", "kPa"],
      "default": "PSI",
      "required": true
    },
    {
      "name": "tramo",
      "type": "text",
      "label": "Tramo / Sistema Probado",
      "required": true
    },
    {
      "name": "equipo",
      "type": "text",
      "label": "Equipo / Manómetro Utilizado"
    }
  ]'::jsonb,
  '{
    "test_name": "Prueba de presurización",
    "units": "",
    "specimens_label": "Prueba",
    "named_tests": [
      {
        "key": "presurizacion",
        "name": "Prueba de presurización",
        "period": 0,
        "samples_per_test": 1,
        "specimens_label": "Prueba",
        "metrics": [
          {
            "key": "presion_inicial",
            "label": "Presión inicial",
            "unit_from": "unidad_presion"
          },
          {
            "key": "presion_final",
            "label": "Presión final",
            "unit_from": "unidad_presion"
          },
          {
            "key": "duracion",
            "label": "Duración de la prueba",
            "unit": "horas"
          },
          {
            "key": "caida",
            "label": "Caída de presión",
            "unit_from": "unidad_presion",
            "computed": "diff:presion_inicial/presion_final",
            "decimals": 2,
            "criteria": [
              {
                "operator": "<=",
                "value": 0,
                "message": "La presión cayó durante la prueba: no se admite ninguna caída (la lectura final debe ser igual a la inicial)"
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
  WHERE template_type = 'pressurization' AND is_global = true
);

-- 2. Prueba de estanqueidad
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
  'Prueba de Estanqueidad',
  'watertightness',
  'Prueba de estanqueidad: el nivel de agua debe mantenerse sin ninguna pérdida durante la prueba (típicamente 24 horas). Registrar foto de la lectura al inicio y al final.',
  '[
    {
      "name": "elemento",
      "type": "select",
      "label": "Elemento Probado",
      "options": ["Tanque", "Bajante", "Red sanitaria", "Cubierta / Terraza", "Otro"],
      "required": true
    },
    {
      "name": "tramo",
      "type": "text",
      "label": "Ubicación / Tramo Probado",
      "required": true
    }
  ]'::jsonb,
  '{
    "test_name": "Prueba de estanqueidad",
    "units": "cm",
    "specimens_label": "Prueba",
    "named_tests": [
      {
        "key": "estanqueidad",
        "name": "Prueba de estanqueidad",
        "period": 0,
        "samples_per_test": 1,
        "specimens_label": "Prueba",
        "metrics": [
          {
            "key": "nivel_inicial",
            "label": "Nivel inicial",
            "unit": "cm"
          },
          {
            "key": "nivel_final",
            "label": "Nivel final",
            "unit": "cm"
          },
          {
            "key": "duracion",
            "label": "Duración de la prueba",
            "unit": "horas"
          },
          {
            "key": "perdida",
            "label": "Pérdida de nivel",
            "unit": "cm",
            "computed": "diff:nivel_inicial/nivel_final",
            "decimals": 2,
            "criteria": [
              {
                "operator": "<=",
                "value": 0,
                "message": "El nivel bajó durante la prueba: no se admite ninguna pérdida (la lectura final debe ser igual a la inicial)"
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
  WHERE template_type = 'watertightness' AND is_global = true
);

-- 3. Bucket para fotos de resultados de control de calidad
INSERT INTO storage.buckets (id, name, public)
VALUES ('quality-control-photos', 'quality-control-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload quality photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload quality photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quality-control-photos');

DROP POLICY IF EXISTS "Anyone can view quality photos" ON storage.objects;
CREATE POLICY "Anyone can view quality photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'quality-control-photos');

DROP POLICY IF EXISTS "Authenticated users can delete quality photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete quality photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quality-control-photos');

-- Verificación
SELECT template_name, template_type,
  jsonb_array_length(custom_fields) AS num_fields,
  jsonb_array_length(test_configuration->'named_tests') AS named_tests
FROM quality_control_templates
WHERE template_type IN ('pressurization', 'watertightness')
  AND is_global = true;

SELECT id, public FROM storage.buckets WHERE id = 'quality-control-photos';
