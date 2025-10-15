-- =====================================================
-- MIGRACIÓN 033: ELIMINAR POLÍTICAS DUPLICADAS PROBLEMÁTICAS
-- =====================================================
-- PROBLEMA: Políticas duplicadas que usan get_user_role() están bloqueando el acceso
-- SOLUCIÓN: Eliminar SOLO las políticas duplicadas, mantener las que funcionan

-- =====================================================
-- PAYMENT_ORDERS
-- =====================================================

-- Eliminar SOLO las políticas duplicadas que usan get_user_role()
-- Mantenemos las políticas que funcionan con profiles.role directamente
DROP POLICY IF EXISTS "admin_manage_payment_orders" ON payment_orders;
DROP POLICY IF EXISTS "gerente_view_payment_orders" ON payment_orders;

-- Las políticas que SE MANTIENEN (ya existen y funcionan):
-- - "Admins can manage all payment orders" (usa profiles.role directamente)
-- - "Super admin can do everything with payment orders" (usa profiles.role directamente)

-- =====================================================
-- FIDUCIARY_ACCOUNTS
-- =====================================================

-- Eliminar SOLO las políticas duplicadas que usan get_user_role()
DROP POLICY IF EXISTS "admin_manage_fiduciary_accounts" ON fiduciary_accounts;
DROP POLICY IF EXISTS "gerente_view_fiduciary_summary" ON fiduciary_accounts;

-- Las políticas que SE MANTIENEN (ya existen y funcionan):
-- - "Admins can manage all fiduciary accounts" (usa profiles.role directamente)
-- - "Super admin can do everything with fiduciary accounts" (usa profiles.role directamente)

COMMENT ON TABLE payment_orders IS 
'Políticas RLS activas: Admins y super_admins tienen acceso completo vía profiles.role';

COMMENT ON TABLE fiduciary_accounts IS 
'Políticas RLS activas: Admins y super_admins tienen acceso completo vía profiles.role';
