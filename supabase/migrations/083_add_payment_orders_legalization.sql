-- =====================================================
-- MIGRACIÓN 083: Legalización independiente de pago
-- =====================================================
-- Agregar campos para legalización sin depender del estado de pago

ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS is_legalized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS legalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS legalized_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN payment_orders.is_legalized IS 'Indica si la orden fue legalizada (presentada a fiducia)';
COMMENT ON COLUMN payment_orders.legalized_at IS 'Fecha/hora de legalización';
COMMENT ON COLUMN payment_orders.legalized_by IS 'Usuario que legalizó la orden';
