-- =====================================================
-- MIGRACIÓN 034: ARREGLAR RLS DE PROJECT_MEMBERS
-- =====================================================
-- Permitir a supervisores agregar miembros a sus proyectos

-- Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "supervisor_can_manage_team" ON project_members;
DROP POLICY IF EXISTS "supervisors_can_add_members" ON project_members;

-- Política para que supervisores puedan agregar miembros a sus proyectos
CREATE POLICY "supervisors_can_add_members" ON project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'supervisor')
    )
  );

-- Política para que supervisores puedan actualizar miembros de sus proyectos
CREATE POLICY "supervisors_can_update_members" ON project_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'supervisor')
    )
  );

-- Política para que supervisores puedan eliminar (desactivar) miembros
CREATE POLICY "supervisors_can_delete_members" ON project_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'supervisor')
    )
  );

COMMENT ON POLICY "supervisors_can_add_members" ON project_members IS 
'Supervisores, admins y super_admins pueden agregar miembros a proyectos';

COMMENT ON POLICY "supervisors_can_update_members" ON project_members IS 
'Supervisores, admins y super_admins pueden actualizar miembros';

COMMENT ON POLICY "supervisors_can_delete_members" ON project_members IS 
'Supervisores, admins y super_admins pueden eliminar miembros';
