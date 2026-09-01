-- =====================================================
-- MIGRACIÓN 100: ENSAYO OPCIONAL DE 56 DÍAS EN MUESTRAS EXISTENTES
-- =====================================================
-- Feedback de Santiago Gil: las muestras de concreto creadas antes de la
-- migración 095 no tienen el ensayo de 56 días. Se agrega como ensayo
-- opcional (no bloquea el cierre de la muestra, migración 096) a toda
-- muestra de concreto activa que no lo tenga.
-- Copia nombre y número de cilindros del ensayo de mayor edad existente;
-- si la muestra no tiene ensayos, usa la configuración de la plantilla.
-- Idempotente: no duplica si la muestra ya tiene ensayo a 56 días.

INSERT INTO quality_control_tests (
  sample_id,
  test_name,
  test_period,
  test_date,
  status,
  test_config
)
SELECT
  s.id,
  COALESCE(
    ref.test_name,
    t.test_configuration->>'test_name',
    'Ensayo a compresión'
  ),
  56,
  (s.sample_date + INTERVAL '56 days')::date,
  'pending',
  jsonb_build_object(
    'cylinders_count', COALESCE(
      (ref.test_config->>'cylinders_count')::int,
      (t.test_configuration->>'samples_per_test')::int,
      3
    ),
    'optional', true
  )
FROM quality_control_samples s
JOIN quality_control_templates t
  ON t.id = s.template_id
 AND t.template_type = 'concrete'
LEFT JOIN LATERAL (
  SELECT qct.test_name, qct.test_config
  FROM quality_control_tests qct
  WHERE qct.sample_id = s.id
  ORDER BY qct.test_period DESC
  LIMIT 1
) ref ON true
WHERE s.status != 'cancelled'
  AND NOT EXISTS (
    SELECT 1
    FROM quality_control_tests qct
    WHERE qct.sample_id = s.id
      AND qct.test_period = 56
  );

-- Verificación: muestras de concreto y si ya tienen ensayo a 56 días
SELECT
  s.sample_code,
  s.status,
  COUNT(*) FILTER (WHERE qct.test_period = 56) AS ensayos_56d
FROM quality_control_samples s
JOIN quality_control_templates t
  ON t.id = s.template_id
 AND t.template_type = 'concrete'
LEFT JOIN quality_control_tests qct ON qct.sample_id = s.id
GROUP BY s.id, s.sample_code, s.status
ORDER BY s.sample_code;
