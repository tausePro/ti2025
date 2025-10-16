-- =====================================================
-- MIGRACIÓN 041: SEPARAR CAMPOS OP E ID EN PAYMENT_ORDERS
-- =====================================================
-- Separar el campo order_number en op_number e id_number
-- para facilitar el registro y visualización

-- Agregar nuevos campos
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS op_number TEXT,
ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Migrar datos existentes (si hay)
-- Formato esperado: "OP438472-ID487601"
UPDATE payment_orders
SET 
  op_number = SPLIT_PART(order_number, '-', 1),
  id_number = SPLIT_PART(order_number, '-', 2)
WHERE order_number IS NOT NULL 
  AND order_number LIKE '%-%';

-- Crear índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_payment_orders_op_number 
ON payment_orders(op_number);

CREATE INDEX IF NOT EXISTS idx_payment_orders_id_number 
ON payment_orders(id_number);

-- Comentarios descriptivos
COMMENT ON COLUMN payment_orders.op_number IS 
'Número de Orden de Pago (ej: OP438472)';

COMMENT ON COLUMN payment_orders.id_number IS 
'Número de ID asociado a la orden (ej: ID487601)';

-- NOTA: Mantenemos order_number por compatibilidad
-- Se puede eliminar en una migración futura si es necesario
