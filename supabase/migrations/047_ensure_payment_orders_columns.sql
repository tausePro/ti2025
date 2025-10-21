-- =====================================================
-- MIGRACIÓN 047: ASEGURAR COLUMNAS EN PAYMENT_ORDERS
-- =====================================================
-- Verificar y agregar columnas faltantes

-- 1. Agregar concept si no existe
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS concept TEXT;

-- 2. Verificar que beneficiary_name existe (debería existir desde migración 007)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_orders' 
    AND column_name = 'beneficiary_name'
  ) THEN
    ALTER TABLE payment_orders ADD COLUMN beneficiary_name TEXT NOT NULL DEFAULT 'N/A';
    RAISE NOTICE '⚠️ Columna beneficiary_name agregada (no debería ser necesario)';
  ELSE
    RAISE NOTICE '✅ Columna beneficiary_name ya existe';
  END IF;
END $$;

-- 3. Verificar columnas agregadas en migraciones anteriores
DO $$
BEGIN
  -- Verificar op_number
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_orders' 
    AND column_name = 'op_number'
  ) THEN
    RAISE NOTICE '✅ Columna op_number existe';
  ELSE
    RAISE WARNING '⚠️ Columna op_number NO existe - ejecutar migración 045';
  END IF;
  
  -- Verificar id_number
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_orders' 
    AND column_name = 'id_number'
  ) THEN
    RAISE NOTICE '✅ Columna id_number existe';
  ELSE
    RAISE WARNING '⚠️ Columna id_number NO existe - ejecutar migración 045';
  END IF;
  
  -- Verificar construction_act
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_orders' 
    AND column_name = 'construction_act'
  ) THEN
    RAISE NOTICE '✅ Columna construction_act existe';
  ELSE
    RAISE WARNING '⚠️ Columna construction_act NO existe - ejecutar migración 046';
  END IF;
  
  -- Verificar order_date
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_orders' 
    AND column_name = 'order_date'
  ) THEN
    RAISE NOTICE '✅ Columna order_date existe';
  ELSE
    RAISE WARNING '⚠️ Columna order_date NO existe - ejecutar migración 046';
  END IF;
END $$;

-- 4. Refrescar schema cache
NOTIFY pgrst, 'reload schema';
