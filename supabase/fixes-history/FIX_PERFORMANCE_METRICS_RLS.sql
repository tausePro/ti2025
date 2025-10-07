-- FIX: Permitir que usuarios autenticados inserten métricas de rendimiento
-- Este script corrige las políticas RLS para performance_metrics

-- 1. Eliminar políticas existentes que pueden estar causando problemas
DROP POLICY IF EXISTS "Super admins can manage all metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Company users can view their company metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Authenticated users can insert metrics" ON performance_metrics;

-- 2. Crear políticas correctas

-- Super admins pueden hacer todo
CREATE POLICY "Super admins can manage all metrics" ON performance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Usuarios autenticados pueden insertar sus propias métricas
CREATE POLICY "Authenticated users can insert metrics" ON performance_metrics
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- Usuarios pueden ver métricas de sus empresas
CREATE POLICY "Company users can view their company metrics" ON performance_metrics
  FOR SELECT USING (
    -- Super admins ven todo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Usuarios ven métricas de sus empresas
    company_id IN (
      SELECT company_id FROM user_company_permissions
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    -- Usuarios ven sus propias métricas
    user_id = auth.uid()
  );

-- 3. Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'performance_metrics'
ORDER BY policyname;
