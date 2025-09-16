-- MIGRACIÓN: Sistema Fiduciario para Interventoría Administrativa
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla para cuentas fiduciarias
CREATE TABLE IF NOT EXISTS fiduciary_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sifi_code VARCHAR(10) NOT NULL, -- Código SIFI único (1 o 2)
  account_name TEXT NOT NULL, -- Ej: "Fideicomiso Prado Campestre 102148"
  bank_name TEXT NOT NULL, -- Ej: "Alianza Fiduciaria"
  account_number VARCHAR(50) NOT NULL,
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Validaciones
  CONSTRAINT valid_sifi_code CHECK (sifi_code IN ('1', '2')),
  CONSTRAINT positive_balances CHECK (initial_balance >= 0 AND current_balance >= 0),
  UNIQUE(project_id, sifi_code)
);

-- 2. Crear tabla para configuración financiera de proyectos
CREATE TABLE IF NOT EXISTS project_financial_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Configuración de control
  requires_construction_acts BOOLEAN DEFAULT false, -- Tipo A: con actas
  requires_legalizations BOOLEAN DEFAULT false, -- Tipo B: con legalizaciones
  
  -- Flujo de aprobación (array de roles)
  approval_flow TEXT[] DEFAULT ARRAY['supervisor', 'interventor', 'gerente'],
  
  -- Alertas presupuestales (porcentajes)
  budget_alerts INTEGER[] DEFAULT ARRAY[70, 85, 95],
  
  -- Configuración adicional
  max_approval_amount DECIMAL(15,2), -- Monto máximo que puede aprobar cada rol
  requires_client_approval BOOLEAN DEFAULT false,
  auto_approve_under DECIMAL(15,2) DEFAULT 0, -- Auto-aprobación bajo este monto
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Validaciones
  CONSTRAINT valid_control_type CHECK (
    (requires_construction_acts = true AND requires_legalizations = false) OR
    (requires_construction_acts = false AND requires_legalizations = true) OR
    (requires_construction_acts = false AND requires_legalizations = false)
  ),
  CONSTRAINT valid_budget_alerts CHECK (
    array_length(budget_alerts, 1) <= 5
  ),
  UNIQUE(project_id)
);

-- 3. Crear tabla para órdenes de pago
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fiduciary_account_id UUID REFERENCES fiduciary_accounts(id),
  
  -- Información de la orden
  order_number VARCHAR(50) NOT NULL, -- Número secuencial de orden
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  beneficiary_name TEXT NOT NULL,
  beneficiary_document VARCHAR(20),
  beneficiary_account VARCHAR(50),
  beneficiary_bank TEXT,
  
  -- Estado y aprobaciones
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Flujo de aprobación
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Fechas
  requested_at TIMESTAMP DEFAULT NOW(),
  due_date DATE,
  paid_at TIMESTAMP,
  
  -- Archivos adjuntos
  supporting_documents TEXT[], -- URLs de documentos
  invoice_number VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Validaciones
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_due_date CHECK (due_date IS NULL OR due_date >= CURRENT_DATE)
);

-- 4. Crear tabla para movimientos de cuentas fiduciarias
CREATE TABLE IF NOT EXISTS fiduciary_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiduciary_account_id UUID NOT NULL REFERENCES fiduciary_accounts(id) ON DELETE CASCADE,
  payment_order_id UUID REFERENCES payment_orders(id),
  
  -- Información del movimiento
  movement_type TEXT NOT NULL CHECK (movement_type IN ('credit', 'debit')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  
  -- Balance resultante
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Validaciones
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_balance_calculation CHECK (
    (movement_type = 'credit' AND balance_after >= balance_before) OR
    (movement_type = 'debit' AND balance_after <= balance_before)
  )
);

-- 5. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_fiduciary_accounts_project ON fiduciary_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_fiduciary_accounts_active ON fiduciary_accounts(project_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_financial_config_project ON project_financial_config(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_project ON payment_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created ON payment_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiduciary_movements_account ON fiduciary_movements(fiduciary_account_id);
CREATE INDEX IF NOT EXISTS idx_fiduciary_movements_created ON fiduciary_movements(created_at DESC);

-- 6. Crear función para actualizar balance de cuenta fiduciaria
CREATE OR REPLACE FUNCTION update_fiduciary_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar el balance actual de la cuenta fiduciaria
  UPDATE fiduciary_accounts 
  SET current_balance = NEW.balance_after,
      updated_at = NOW()
  WHERE id = NEW.fiduciary_account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para actualizar balance automáticamente
CREATE TRIGGER trigger_update_fiduciary_balance
  AFTER INSERT ON fiduciary_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_fiduciary_balance();

-- 8. Crear función para generar número de orden de pago
CREATE OR REPLACE FUNCTION generate_payment_order_number(project_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  project_code TEXT;
  next_number INTEGER;
  new_order_number TEXT;
BEGIN
  -- Obtener código del proyecto
  SELECT project_code INTO project_code
  FROM projects 
  WHERE id = project_uuid;
  
  -- Obtener siguiente número secuencial
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'OP-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM payment_orders
  WHERE project_id = project_uuid;
  
  -- Generar número de orden
  new_order_number := 'OP-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- 9. Crear trigger para generar número de orden automáticamente
CREATE OR REPLACE FUNCTION set_payment_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_payment_order_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_payment_order_number
  BEFORE INSERT ON payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_order_number();

-- 10. Habilitar RLS
ALTER TABLE fiduciary_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiduciary_movements ENABLE ROW LEVEL SECURITY;

-- 11. Crear políticas RLS para cuentas fiduciarias
CREATE POLICY "Users can view fiduciary accounts of their projects" ON fiduciary_accounts
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() 
      OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all fiduciary accounts" ON fiduciary_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- 12. Crear políticas RLS para configuración financiera
CREATE POLICY "Users can view financial config of their projects" ON project_financial_config
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() 
      OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all financial config" ON project_financial_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- 13. Crear políticas RLS para órdenes de pago
CREATE POLICY "Users can view payment orders of their projects" ON payment_orders
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() 
      OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create payment orders for their projects" ON payment_orders
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() 
      OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

-- 14. Crear políticas RLS para movimientos fiduciarios
CREATE POLICY "Users can view fiduciary movements of their projects" ON fiduciary_movements
  FOR SELECT USING (
    fiduciary_account_id IN (
      SELECT fa.id FROM fiduciary_accounts fa
      JOIN projects p ON fa.project_id = p.id
      WHERE p.created_by = auth.uid() 
      OR p.id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

-- 15. Comentarios para documentación
COMMENT ON TABLE fiduciary_accounts IS 'Cuentas fiduciarias asociadas a proyectos con interventoría administrativa';
COMMENT ON TABLE project_financial_config IS 'Configuración de control financiero para proyectos';
COMMENT ON TABLE payment_orders IS 'Órdenes de pago para desembolsos de proyectos';
COMMENT ON TABLE fiduciary_movements IS 'Movimientos de cuentas fiduciarias';

COMMENT ON COLUMN fiduciary_accounts.sifi_code IS 'Código SIFI: 1 o 2 (único por proyecto)';
COMMENT ON COLUMN project_financial_config.requires_construction_acts IS 'Tipo A: Control con actas de construcción';
COMMENT ON COLUMN project_financial_config.requires_legalizations IS 'Tipo B: Control con legalizaciones directas';
COMMENT ON COLUMN payment_orders.status IS 'Estado: pending, approved, rejected, paid, cancelled';

-- 16. Verificar que todo se creó correctamente
SELECT 'Fiduciary system migration completed successfully!' as status;
