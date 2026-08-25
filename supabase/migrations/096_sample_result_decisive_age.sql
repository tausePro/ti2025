-- =====================================================
-- MIGRACIÓN 096: VEREDICTO POR EDAD DECISIVA Y ENSAYOS OPCIONALES
-- =====================================================
-- Feedback de supervisión (Santiago Gil):
-- La norma obliga el resultado a 28 días, pero si no es satisfactorio
-- se fallan cilindros a 56 días y ese resultado se tiene en cuenta para
-- la liberación del elemento. Por eso:
-- 1. El veredicto de la muestra lo da el ensayo COMPLETADO de mayor
--    edad (test_period más alto) que tenga resultados: si el de 56 días
--    cumple, la muestra cumple aunque el de 28 haya fallado.
-- 2. Los ensayos marcados como opcionales en test_config
--    (test_config->>'optional' = 'true', ej. 56 días) no bloquean el
--    cierre de la muestra: esta queda 'completed' cuando todos los
--    ensayos obligatorios están completados.

BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_sample_overall_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sample_id UUID;
  v_required_total INTEGER;
  v_required_completed INTEGER;
  v_any_completed INTEGER;
  v_decisive_test_id UUID;
  v_decisive_failed BOOLEAN;
  v_decisive_unevaluated BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'quality_control_results' THEN
    SELECT qct.sample_id
    INTO v_sample_id
    FROM public.quality_control_tests qct
    WHERE qct.id = NEW.test_id;
  ELSIF TG_TABLE_NAME = 'quality_control_tests' THEN
    v_sample_id := NEW.sample_id;
  END IF;

  IF v_sample_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COUNT(*) FILTER (
      WHERE COALESCE((qct.test_config->>'optional')::boolean, false) = false
    ),
    COUNT(*) FILTER (
      WHERE COALESCE((qct.test_config->>'optional')::boolean, false) = false
        AND qct.status = 'completed'
    ),
    COUNT(*) FILTER (WHERE qct.status = 'completed')
  INTO v_required_total, v_required_completed, v_any_completed
  FROM public.quality_control_tests qct
  WHERE qct.sample_id = v_sample_id;

  SELECT qct.id
  INTO v_decisive_test_id
  FROM public.quality_control_tests qct
  WHERE qct.sample_id = v_sample_id
    AND qct.status = 'completed'
    AND EXISTS (
      SELECT 1
      FROM public.quality_control_results qcr
      WHERE qcr.test_id = qct.id
    )
  ORDER BY qct.test_period DESC
  LIMIT 1;

  IF v_any_completed = 0 THEN
    UPDATE public.quality_control_samples
    SET status = 'pending',
        overall_result = NULL
    WHERE id = v_sample_id;
    RETURN NEW;
  END IF;

  IF v_required_completed < v_required_total THEN
    UPDATE public.quality_control_samples
    SET status = 'in_progress',
        overall_result = NULL
    WHERE id = v_sample_id;
    RETURN NEW;
  END IF;

  IF v_decisive_test_id IS NULL THEN
    UPDATE public.quality_control_samples
    SET status = 'completed',
        overall_result = 'SIN EVALUAR'
    WHERE id = v_sample_id;
    RETURN NEW;
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.quality_control_results qcr
      WHERE qcr.test_id = v_decisive_test_id
        AND qcr.meets_criteria IS FALSE
    ),
    EXISTS (
      SELECT 1
      FROM public.quality_control_results qcr
      WHERE qcr.test_id = v_decisive_test_id
        AND qcr.meets_criteria IS NULL
    )
  INTO v_decisive_failed, v_decisive_unevaluated;

  UPDATE public.quality_control_samples
  SET status = 'completed',
      overall_result = CASE
        WHEN v_decisive_failed THEN 'NO CUMPLE'
        WHEN v_decisive_unevaluated THEN 'SIN EVALUAR'
        ELSE 'CUMPLE'
      END
  WHERE id = v_sample_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_sample_result
  ON public.quality_control_results;

CREATE TRIGGER trigger_calculate_sample_result
  AFTER INSERT OR UPDATE ON public.quality_control_results
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sample_overall_result();

DROP TRIGGER IF EXISTS trigger_calculate_sample_result_from_test
  ON public.quality_control_tests;

CREATE TRIGGER trigger_calculate_sample_result_from_test
  AFTER UPDATE OF status ON public.quality_control_tests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.calculate_sample_overall_result();

COMMIT;
