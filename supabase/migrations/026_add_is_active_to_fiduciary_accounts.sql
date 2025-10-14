-- =====================================================
-- MIGRACIÓN 026: AGREGAR COLUMNA IS_ACTIVE A FIDUCIARY_ACCOUNTS
-- =====================================================

-- Agregar columna is_active
ALTER TABLE fiduciary_accounts
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Actualizar registros existentes
UPDATE fiduciary_accounts
SET is_active = true
WHERE is_active IS NULL;

COMMENT ON COLUMN fiduciary_accounts.is_active IS 
'Indica si la cuenta fiduciaria está activa y puede recibir órdenes de pago';
