-- =====================================================
-- MIGRACIÓN 104: Informe quincenal - Etapa 1
-- =====================================================
-- 1. Fotos curadas del informe (report_photos): el residente elige,
--    ordena y titula las fotos que van al informe, sin límite artificial.
-- 2. Snapshot congelado de bitácoras: al enviar a revisión se registra
--    qué bitácoras alimentaron el informe (source_daily_log_ids) y desde
--    cuándo (source_frozen_at). Si una bitácora incluida cambia después,
--    el informe queda marcado con source_modified_at.
-- 3. RLS: el rol 'cliente' solo puede ver informes en estado 'published'.

-- -----------------------------------------------------
-- 1 y 2. Nuevas columnas
-- -----------------------------------------------------
ALTER TABLE biweekly_reports
  ADD COLUMN IF NOT EXISTS report_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_daily_log_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS source_frozen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_modified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_modified_log_id UUID;

COMMENT ON COLUMN biweekly_reports.report_photos IS
  'Fotos curadas para el informe: [{file_url, caption, sort_order, included, source_type, source_id, taken_at}]';
COMMENT ON COLUMN biweekly_reports.source_daily_log_ids IS
  'IDs de daily_logs incluidas en el snapshot (source_data) del informe';
COMMENT ON COLUMN biweekly_reports.source_frozen_at IS
  'Momento en que se congeló el snapshot (al enviar a revisión). NULL mientras es borrador vivo.';
COMMENT ON COLUMN biweekly_reports.source_modified_at IS
  'Última modificación de una bitácora incluida después de congelar el snapshot';

CREATE INDEX IF NOT EXISTS idx_biweekly_reports_source_daily_log_ids
  ON biweekly_reports USING GIN (source_daily_log_ids);

-- -----------------------------------------------------
-- 2. Trigger: marcar informes cuya fuente cambió
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION flag_biweekly_reports_source_modified()
RETURNS TRIGGER AS $$
DECLARE
  v_log_id UUID;
BEGIN
  v_log_id := COALESCE(OLD.id, NEW.id);

  UPDATE biweekly_reports
  SET source_modified_at = NOW(),
      source_modified_log_id = v_log_id
  WHERE source_frozen_at IS NOT NULL
    AND v_log_id = ANY(source_daily_log_ids);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_daily_logs_flag_report_source_modified ON daily_logs;
CREATE TRIGGER trg_daily_logs_flag_report_source_modified
  AFTER UPDATE OR DELETE ON daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION flag_biweekly_reports_source_modified();

-- Función para congelar el snapshot al enviar a revisión.
-- Solo el creador puede congelar, y solo desde draft/rejected.
CREATE OR REPLACE FUNCTION freeze_biweekly_report_source(p_report_id UUID)
RETURNS VOID AS $$
DECLARE
  v_report biweekly_reports%ROWTYPE;
  v_log_ids UUID[];
BEGIN
  SELECT * INTO v_report FROM biweekly_reports WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Informe no encontrado';
  END IF;

  IF v_report.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Solo el creador del informe puede congelar la fuente';
  END IF;

  IF v_report.status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'El informe no está en un estado editable';
  END IF;

  SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO v_log_ids
  FROM daily_logs
  WHERE project_id = v_report.project_id
    AND date >= v_report.period_start
    AND date <= v_report.period_end;

  UPDATE biweekly_reports
  SET source_daily_log_ids = v_log_ids,
      source_frozen_at = NOW(),
      source_modified_at = NULL,
      source_modified_log_id = NULL
  WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION freeze_biweekly_report_source(UUID) TO authenticated;

-- -----------------------------------------------------
-- 3. RLS: cliente solo ve informes publicados
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view their project reports" ON biweekly_reports;
CREATE POLICY "Users can view their project reports"
  ON biweekly_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM project_members pm
      JOIN profiles p ON p.id = pm.user_id
      WHERE pm.project_id = biweekly_reports.project_id
        AND pm.user_id = auth.uid()
        AND pm.is_active = TRUE
        -- Cliente (por rol global o por rol en el proyecto) solo ve publicados
        AND (
          (p.role <> 'cliente' AND pm.role_in_project <> 'cliente')
          OR biweekly_reports.status = 'published'
        )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'gerente')
    )
  );

-- -----------------------------------------------------
-- 4. Plantillas: conclusiones alimentadas por bitácora
-- -----------------------------------------------------
-- Se agrega el placeholder {{bitacora.conclusiones}} (observaciones,
-- novedades y recomendaciones registradas en las bitácoras del período)
-- a las secciones de conclusiones/observaciones/recomendaciones que aún
-- no lo tengan. Es un append no destructivo.
UPDATE section_templates
SET base_content = COALESCE(base_content, '') ||
  E'\n<h3>Observaciones, novedades y recomendaciones registradas en bitácora</h3>\n{{bitacora.conclusiones}}'
WHERE section_key IN ('section_6', 'conclusions', 'observations', 'recommendations')
  AND COALESCE(base_content, '') NOT LIKE '%{{bitacora.conclusiones}}%'
  AND COALESCE(base_content, '') NOT LIKE '%{{bitacora.observaciones_periodo}}%';
