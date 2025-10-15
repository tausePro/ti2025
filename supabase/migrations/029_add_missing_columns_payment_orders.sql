-- =====================================================
-- MIGRACIÓN 029: AGREGAR COLUMNAS FALTANTES A PAYMENT_ORDERS
-- =====================================================
-- PROBLEMA: Faltan columnas necesarias para el formulario de órdenes de pago
-- SOLUCIÓN: Agregar description, priority, notes, payment_date

-- 1. Agregar columna description
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Agregar columna priority
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_priority') THEN
    CREATE TYPE payment_priority AS ENUM ('low', 'normal', 'high', 'urgent');
  END IF;
END $$;

ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS priority payment_priority DEFAULT 'normal';

-- 3. Agregar columna notes
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Agregar columna payment_date (fecha deseada de pago)
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- 5. Agregar columna requested_by (quien solicita la orden)
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES profiles(id);

-- 6. Agregar columna requested_at (timestamp de solicitud)
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON COLUMN payment_orders.description IS 'Descripción detallada del motivo del pago';
COMMENT ON COLUMN payment_orders.priority IS 'Prioridad de la orden: low, normal, high, urgent';
COMMENT ON COLUMN payment_orders.notes IS 'Notas adicionales o instrucciones especiales';
COMMENT ON COLUMN payment_orders.payment_date IS 'Fecha deseada de pago';
COMMENT ON COLUMN payment_orders.requested_by IS 'Usuario que solicitó la orden de pago';
COMMENT ON COLUMN payment_orders.requested_at IS 'Fecha y hora de solicitud de la orden';
