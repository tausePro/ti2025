BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_sample_overall_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sample_id UUID;
  v_total_tests INTEGER;
  v_completed_tests INTEGER;
  v_failed_tests INTEGER;
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
    COUNT(*),
    COUNT(*) FILTER (WHERE qct.status = 'completed'),
    COUNT(*) FILTER (
      WHERE qct.status = 'completed'
        AND EXISTS (
          SELECT 1
          FROM public.quality_control_results qcr
          WHERE qcr.test_id = qct.id
            AND qcr.meets_criteria IS FALSE
        )
    )
  INTO v_total_tests, v_completed_tests, v_failed_tests
  FROM public.quality_control_tests qct
  WHERE qct.sample_id = v_sample_id;

  IF v_total_tests = 0 OR v_completed_tests = 0 THEN
    UPDATE public.quality_control_samples
    SET status = 'pending',
        overall_result = NULL
    WHERE id = v_sample_id;
  ELSIF v_completed_tests = v_total_tests THEN
    UPDATE public.quality_control_samples
    SET status = 'completed',
        overall_result = CASE
          WHEN v_failed_tests > 0 THEN 'NO CUMPLE'
          ELSE 'CUMPLE'
        END
    WHERE id = v_sample_id;
  ELSE
    UPDATE public.quality_control_samples
    SET status = 'in_progress',
        overall_result = NULL
    WHERE id = v_sample_id;
  END IF;

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
