-- =====================================================
-- MIGRACIÓN 030: FIX DEFINITIVO DE FOREIGN KEYS EN PAYMENT_ORDERS
-- =====================================================
-- PROBLEMA: created_by y approved_by apuntan a 'users' pero deberían apuntar a 'profiles'
-- SOLUCIÓN: Cambiar todas las FK a profiles

-- 1. Eliminar foreign keys incorrectas
ALTER TABLE payment_orders
DROP CONSTRAINT IF EXISTS payment_orders_created_by_fkey;

ALTER TABLE payment_orders
DROP CONSTRAINT IF EXISTS payment_orders_approved_by_fkey;

-- 2. Crear foreign keys correctas apuntando a profiles
ALTER TABLE payment_orders
ADD CONSTRAINT payment_orders_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

ALTER TABLE payment_orders
ADD CONSTRAINT payment_orders_approved_by_fkey 
FOREIGN KEY (approved_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- 3. Hacer que created_by sea nullable (por compatibilidad)
ALTER TABLE payment_orders
ALTER COLUMN created_by DROP NOT NULL;

COMMENT ON CONSTRAINT payment_orders_created_by_fkey ON payment_orders IS 
'Referencia al perfil del usuario que creó la orden de pago';

COMMENT ON CONSTRAINT payment_orders_approved_by_fkey ON payment_orders IS 
'Referencia al perfil del usuario que aprobó la orden de pago';
