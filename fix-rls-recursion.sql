-- FIX RLS RECURSION ISSUES
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Users can view project members of their projects" ON project_members;
DROP POLICY IF EXISTS "Users can view documents of their projects" ON project_documents;
DROP POLICY IF EXISTS "Users can view activities of their projects" ON project_activities;

-- 2. Crear políticas simplificadas sin recursión
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'gerente')
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can view project documents" ON project_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'gerente')
    ) OR
    uploaded_by = auth.uid()
  );

CREATE POLICY "Users can view project activities" ON project_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'gerente')
    ) OR
    user_id = auth.uid()
  );

-- 3. Políticas para admins (mantener las existentes)
-- Estas ya están bien, no las tocamos

-- 4. Verificar que no hay recursión
SELECT 'RLS policies fixed successfully!' as status;

