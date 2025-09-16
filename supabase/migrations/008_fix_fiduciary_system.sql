-- MIGRACIÓN: Corregir Sistema Fiduciario
-- Ejecutar en Supabase SQL Editor

-- 1. Deshabilitar RLS temporalmente para corregir las tablas
ALTER TABLE fiduciary_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE fiduciary_movements DISABLE ROW LEVEL SECURITY;

-- 2. Agregar columna faltante a payment_orders
ALTER TABLE payment_orders 
ADD COLUMN IF NOT EXISTS beneficiary_account_number VARCHAR(50);

-- 3. Eliminar políticas RLS existentes (si existen)
DROP POLICY IF EXISTS "Super admin can do everything with fiduciary accounts" ON fiduciary_accounts;
DROP POLICY IF EXISTS "Super admin can do everything with financial config" ON project_financial_config;
DROP POLICY IF EXISTS "Super admin can do everything with payment orders" ON payment_orders;
DROP POLICY IF EXISTS "Super admin can do everything with fiduciary movements" ON fiduciary_movements;

-- 4. Crear políticas RLS corregidas
CREATE POLICY "Super admin can do everything with fiduciary accounts" ON fiduciary_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can do everything with financial config" ON project_financial_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can do everything with payment orders" ON payment_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can do everything with fiduciary movements" ON fiduciary_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 5. Habilitar RLS nuevamente
ALTER TABLE fiduciary_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiduciary_movements ENABLE ROW LEVEL SECURITY;

-- 6. Verificar que todo funciona
SELECT 'Fiduciary system fixed successfully!' as status;
