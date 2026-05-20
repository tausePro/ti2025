-- =====================================================
-- MIGRACIÓN 090: RPC PARA ACTUALIZAR PLANTILLA DE CHECKLIST DEL PROYECTO
-- =====================================================
-- Permite que cualquier miembro del proyecto (incluido residente)
-- actualice la plantilla de checklists del proyecto sin necesidad de
-- privilegios de admin/supervisor.
--
-- La función:
--   - Es SECURITY DEFINER, así no requiere relajar la RLS de daily_log_configs.
--   - Solo escribe en la columna custom_checklists. No toca settings,
--     custom_fields ni is_enabled.
--   - Valida que el invocador sea miembro del proyecto.
--   - Hace upsert por (project_id) si la config aún no existe.
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.update_project_checklist_template(
  p_project_id uuid,
  p_checklists jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_is_member boolean;
  v_result    jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado'
      USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'project_id es requerido'
      USING ERRCODE = '22023';
  END IF;

  IF p_checklists IS NULL OR jsonb_typeof(p_checklists) <> 'array' THEN
    RAISE EXCEPTION 'p_checklists debe ser un array JSON'
      USING ERRCODE = '22023';
  END IF;

  -- Validar pertenencia al proyecto.
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id    = v_user
  )
  INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'No tienes permiso sobre este proyecto'
      USING ERRCODE = '42501';
  END IF;

  -- Upsert: solo toca custom_checklists. Settings y custom_fields no se ven afectados.
  INSERT INTO public.daily_log_configs (project_id, custom_checklists, created_by)
  VALUES (p_project_id, p_checklists, v_user)
  ON CONFLICT (project_id) DO UPDATE
    SET custom_checklists = EXCLUDED.custom_checklists,
        updated_at        = NOW();

  SELECT to_jsonb(dlc.*) INTO v_result
  FROM public.daily_log_configs dlc
  WHERE dlc.project_id = p_project_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.update_project_checklist_template(uuid, jsonb) IS
  'Actualiza únicamente la plantilla de checklists (custom_checklists) del proyecto. '
  'Cualquier miembro del proyecto puede invocarla. SECURITY DEFINER + validación '
  'de pertenencia para no relajar la RLS de daily_log_configs.';

REVOKE ALL ON FUNCTION public.update_project_checklist_template(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_project_checklist_template(uuid, jsonb) TO authenticated;

COMMIT;
