-- =====================================================
-- MIGRACIÓN 105: Residentes ven todas las bitácoras de sus proyectos
-- =====================================================
-- Contexto: dos residentes asignados al mismo proyecto (por ejemplo, el
-- residente y su auxiliar) no veían las bitácoras del otro, porque las
-- políticas RLS de daily_logs limitan al residente a sus propios registros
-- (created_by = auth.uid()). Por la misma razón, el informe quincenal que
-- genera un residente solo incluía sus propias bitácoras.
--
-- Cambio aditivo y no destructivo:
-- - Nueva política SOLO DE LECTURA: un usuario con rol global 'residente'
--   que sea miembro activo del proyecto (con rol en el proyecto distinto de
--   'cliente') ve todas las bitácoras de ese proyecto.
-- - No se modifica ni elimina ninguna política existente: crear, editar y
--   eliminar siguen limitados a las bitácoras propias del residente.
-- - El cliente sigue sin acceso a bitácoras.
--
-- Rollback: supabase/fixes-history/ROLLBACK_105_daily_logs_residentes_ven_bitacoras_del_proyecto.sql

DROP POLICY IF EXISTS "residente_view_project_logs" ON daily_logs;

CREATE POLICY "residente_view_project_logs" ON daily_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'residente'
    )
    AND EXISTS (
      SELECT 1
      FROM project_members pm
      WHERE pm.project_id = daily_logs.project_id
        AND pm.user_id = auth.uid()
        AND pm.is_active = TRUE
        AND pm.role_in_project <> 'cliente'
    )
  );

COMMENT ON POLICY "residente_view_project_logs" ON daily_logs IS
  'Migración 105: residentes miembros activos del proyecto ven todas sus bitácoras (solo lectura).';
