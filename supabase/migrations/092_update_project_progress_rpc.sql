-- =====================================================
-- 092: RPC para actualizar el avance de obra del proyecto
-- =====================================================
-- Permite que el residente asignado (miembro activo del proyecto)
-- actualice SOLO el progress_percentage, sin darle permiso de
-- edición completa sobre projects (que RLS le niega).
-- Roles admin, super_admin, gerente y supervisor pueden actualizar
-- el avance de cualquier proyecto.

CREATE OR REPLACE FUNCTION update_project_progress(
  p_project_id UUID,
  p_percentage INTEGER
)
RETURNS void AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_percentage IS NULL OR p_percentage < 0 OR p_percentage > 100 THEN
    RAISE EXCEPTION 'El porcentaje de avance debe estar entre 0 y 100';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role IN ('admin', 'super_admin', 'gerente', 'supervisor')
     OR (
       v_role = 'residente'
       AND EXISTS (
         SELECT 1 FROM public.project_members
         WHERE project_members.project_id = p_project_id
           AND project_members.user_id = auth.uid()
           AND project_members.is_active = true
       )
     )
  THEN
    UPDATE public.projects
    SET progress_percentage = p_percentage,
        last_activity_at = NOW()
    WHERE id = p_project_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proyecto no encontrado';
    END IF;
  ELSE
    RAISE EXCEPTION 'No tiene permisos para actualizar el avance de este proyecto';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION update_project_progress(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_project_progress(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION update_project_progress(UUID, INTEGER) IS
  'Actualiza solo el avance (%) de un proyecto. Residente: solo proyectos donde es miembro activo. Admin/gerente/supervisor: cualquier proyecto.';
