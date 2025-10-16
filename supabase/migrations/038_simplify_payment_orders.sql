-- =====================================================
-- MIGRACIÓN 038: SIMPLIFICAR PAYMENT_ORDERS
-- =====================================================
-- Convertir payment_orders en un registro simple de estado de cuentas
-- Talento NO genera órdenes, solo registra y reporta

-- Agregar nuevas columnas necesarias
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS construction_act_reference TEXT;

-- Renombrar/ajustar columnas existentes si es necesario
-- El campo 'status' ya existe, solo necesitamos ajustar los valores permitidos

-- Crear índice para búsqueda rápida por número de orden
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_number 
ON payment_orders(order_number);

-- Crear índice para búsqueda por fecha
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_date 
ON payment_orders(order_date);

-- Comentarios descriptivos
COMMENT ON COLUMN payment_orders.order_number IS 
'Número de orden de giro proporcionado por el cliente (ej: OP438472-ID487601)';

COMMENT ON COLUMN payment_orders.order_date IS 
'Fecha de la orden de giro del cliente';

COMMENT ON COLUMN payment_orders.construction_act_reference IS 
'Referencia al acta de construcción asociada (ej: 7, 1Pq, 30, etc.)';

COMMENT ON COLUMN payment_orders.status IS 
'Estado de la orden: 
- authorized: Autorizado por Talento Inmobiliario (88%)
- legalized: Legalizado/Ejecutado (0%)
- pending_review: Pendiente de revisión
- rejected: Rechazado';

-- El campo beneficiary_name ya existe desde la migración 007
-- Solo actualizamos el comentario si es necesario
COMMENT ON COLUMN payment_orders.beneficiary_name IS 
'Nombre del beneficiario que recibirá el pago (ej: Mensula SAS, Londoño Gomez SAS)';

COMMENT ON TABLE payment_orders IS 
'Registro de órdenes de pago autorizadas por Talento Inmobiliario.
Talento actúa como aprobador intermedio en el flujo del cliente.
Este módulo genera reportes de estado de cuentas para el cliente.';
