-- =====================================================
-- MIGRACIÓN 099: DESIGNACIONES DE MALLA ELECTROSOLDADA (NTC-5806)
-- =====================================================
-- Según formato de Santiago Gil: las mallas se identifican por designación
-- D-50 a D-335, no por diámetro de barra (#2-#10).
-- Amplía las opciones del campo "diametro" para incluir ambas.
-- Los criterios de alargamiento/relación no se afectan: sus condiciones
-- exigen tipo_producto = Barra corrugada además del diámetro #.

UPDATE quality_control_templates
SET
  custom_fields = jsonb_set(
    jsonb_set(
      custom_fields,
      '{1,label}',
      '"Diámetro (barra) / Designación (malla)"'
    ),
    '{1,options}',
    '["#2", "#3", "#4", "#5", "#6", "#7", "#8", "#9", "#10", "D-50", "D-63", "D-84", "D-106", "D-131", "D-158", "D-188", "D-221", "D-257", "D-335"]'::jsonb
  ),
  updated_at = NOW()
WHERE template_type = 'steel'
  AND is_global = true
  AND custom_fields->1->>'name' = 'diametro';

-- Verificación
SELECT
  template_name,
  custom_fields->1->>'label' AS label_diametro,
  jsonb_array_length(custom_fields->1->'options') AS num_opciones
FROM quality_control_templates
WHERE template_type = 'steel'
  AND is_global = true;
