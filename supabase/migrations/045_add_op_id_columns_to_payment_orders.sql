-- =====================================================
-- MIGRACIÓN 045: AGREGAR COLUMNAS OP E ID A PAYMENT_ORDERS
-- =====================================================
-- Agregar columnas op_number e id_number para separar
-- el número de orden de pago en dos campos

-- 1. Agregar columnas si no existen
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS op_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS id_number VARCHAR(20);

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_payment_orders_op_id 
ON payment_orders(op_number, id_number);

-- 3. Comentarios
COMMENT ON COLUMN payment_orders.op_number IS 'Número OP de la orden de pago';
COMMENT ON COLUMN payment_orders.id_number IS 'Número ID de la orden de pago';

-- 4. Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_orders' 
    AND column_name IN ('op_number', 'id_number')
  ) THEN
    RAISE NOTICE '✅ Columnas op_number e id_number agregadas correctamente';
  ELSE
    RAISE WARNING '⚠️ Error al agregar columnas';
  END IF;
END $$;
