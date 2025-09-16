-- MIGRACIÓN SIMPLE: Sistema Fiduciario para Interventoría Administrativa
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla para cuentas fiduciarias
CREATE TABLE IF NOT EXISTS fiduciary_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sifi_code VARCHAR(10) NOT NULL,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT valid_sifi_code CHECK (sifi_code IN ('1', '2')),
  CONSTRAINT positive_balances CHECK (initial_balance >= 0 AND current_balance >= 0),
  UNIQUE(project_id, sifi_code)
);

-- 2. Crear tabla para configuración financiera
CREATE TABLE IF NOT EXISTS project_financial_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requires_construction_acts BOOLEAN DEFAULT false,
  requires_legalizations BOOLEAN DEFAULT false,
  approval_flow TEXT[] DEFAULT ARRAY['supervisor', 'interventor', 'gerente'],
  budget_alerts INTEGER[] DEFAULT ARRAY[70, 85, 95],
  max_approval_amount DECIMAL(15,2),
  requires_client_approval BOOLEAN DEFAULT false,
  auto_approve_under DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT valid_control_type CHECK (
    (requires_construction_acts = true AND requires_legalizations = false) OR
    (requires_construction_acts = false AND requires_legalizations = true) OR
    (requires_construction_acts = false AND requires_legalizations = false)
  ),
  UNIQUE(project_id)
);

-- 3. Crear tabla para órdenes de pago
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fiduciary_account_id UUID REFERENCES fiduciary_accounts(id),
  order_number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  beneficiary_name TEXT NOT NULL,
  beneficiary_document VARCHAR(20),
  beneficiary_account VARCHAR(50),
  beneficiary_bank TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  due_date DATE,
  paid_at TIMESTAMP,
  supporting_documents TEXT[],
  invoice_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- 4. Crear tabla para movimientos fiduciarios
CREATE TABLE IF NOT EXISTS fiduciary_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiduciary_account_id UUID NOT NULL REFERENCES fiduciary_accounts(id) ON DELETE CASCADE,
  payment_order_id UUID REFERENCES payment_orders(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('credit', 'debit')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- 5. Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_fiduciary_accounts_project ON fiduciary_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_financial_config_project ON project_financial_config(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_project ON payment_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_fiduciary_movements_account ON fiduciary_movements(fiduciary_account_id);

-- 6. Habilitar RLS
ALTER TABLE fiduciary_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiduciary_movements ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS básicas
CREATE POLICY "Admins can manage all fiduciary accounts" ON fiduciary_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
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

CREATE POLICY "Admins can manage all payment orders" ON payment_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage all fiduciary movements" ON fiduciary_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- 8. Verificar creación
SELECT 'Fiduciary system migration completed successfully!' as status;
