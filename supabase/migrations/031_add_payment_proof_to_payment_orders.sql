-- =====================================================
-- MIGRACIÓN 031: AGREGAR CAMPO PARA SOPORTE DE PAGO
-- =====================================================
-- PROBLEMA: No hay campo para guardar el soporte/comprobante del pago
-- SOLUCIÓN: Agregar payment_proof_url para almacenar el documento

-- 1. Agregar columna para el soporte de pago
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- 2. Agregar columna para nombre del archivo
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS payment_proof_filename TEXT;

-- 3. Agregar columna para notas del pago
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

COMMENT ON COLUMN payment_orders.payment_proof_url IS 
'URL del documento de soporte/comprobante del pago';

COMMENT ON COLUMN payment_orders.payment_proof_filename IS 
'Nombre original del archivo de soporte de pago';

COMMENT ON COLUMN payment_orders.payment_notes IS 
'Notas adicionales sobre el pago realizado';
