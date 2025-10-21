-- =====================================================
-- MIGRACIÓN 046: SIMPLIFICAR PAYMENT_ORDERS
-- =====================================================
-- Eliminar dependencia de cuentas fiduciarias
-- Agregar campo construction_act para actas de construcción

-- 1. Agregar campo construction_act
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS construction_act VARCHAR(50);

-- 2. Hacer fiduciary_account_id nullable (opcional)
ALTER TABLE payment_orders
ALTER COLUMN fiduciary_account_id DROP NOT NULL;

-- 3. Agregar order_date si no existe
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;

-- 4. Comentarios
COMMENT ON COLUMN payment_orders.construction_act IS 'Número o referencia del acta de construcción asociada';
COMMENT ON COLUMN payment_orders.order_date IS 'Fecha de la orden de pago';

-- 5. Índice para búsquedas por acta
CREATE INDEX IF NOT EXISTS idx_payment_orders_construction_act 
ON payment_orders(construction_act);

-- 6. Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_orders' 
    AND column_name = 'construction_act'
  ) THEN
    RAISE NOTICE '✅ Campo construction_act agregado correctamente';
  ELSE
    RAISE WARNING '⚠️ Error al agregar campo construction_act';
  END IF;
  
  -- Verificar que fiduciary_account_id es nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_orders' 
    AND column_name = 'fiduciary_account_id'
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE '✅ fiduciary_account_id ahora es nullable';
  END IF;
END $$;
