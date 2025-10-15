-- =====================================================
-- MIGRACIÓN 035: ARREGLAR POLÍTICA SELECT DE PROJECT_MEMBERS
-- =====================================================
-- Permitir a supervisores VER miembros de proyectos

-- Eliminar la política existente que no incluye supervisor
DROP POLICY IF EXISTS "Users can view project members" ON project_members;

-- Crear nueva política que incluye supervisor
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT TO public
  USING (
    -- Admins, gerentes y supervisores pueden ver todos los miembros
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'gerente', 'supervisor')
    )
    OR
    -- Los usuarios pueden ver sus propias asignaciones
    user_id = auth.uid()
  );

COMMENT ON POLICY "Users can view project members" ON project_members IS 
'Admins, gerentes, supervisores pueden ver todos los miembros. Los usuarios ven sus propias asignaciones.';
