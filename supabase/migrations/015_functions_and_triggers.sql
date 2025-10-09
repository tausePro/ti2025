-- =====================================================
-- Migration: 015 - Functions and Triggers
-- Description: Funciones auxiliares y triggers para flujo automatizado
-- Date: 2025-10-08
-- =====================================================

BEGIN;

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_role() IS 'Obtiene el rol del usuario autenticado actual';

-- Función para verificar capacidad del rol
CREATE OR REPLACE FUNCTION has_capability(p_capability text)
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM role_capabilities rc
    INNER JOIN profiles p ON p.role = rc.role
    WHERE p.id = auth.uid()
    AND rc.capability = p_capability
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION has_capability(text) IS 'Verifica si el usuario actual tiene una capacidad específica';

-- Función para verificar si es miembro del proyecto
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM project_members 
    WHERE project_id = p_project_id 
    AND user_id = auth.uid()
    AND is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_project_member(uuid) IS 'Verifica si el usuario actual es miembro activo del proyecto';

-- ============================================
-- FUNCIONES DE NEGOCIO
-- ============================================

-- Función para obtener siguiente número de orden de pago
CREATE OR REPLACE FUNCTION get_next_payment_order_number(p_project_id uuid)
RETURNS varchar AS $$
DECLARE
  v_project_code varchar;
  v_count integer;
  v_year varchar;
BEGIN
  SELECT project_code INTO v_project_code FROM projects WHERE id = p_project_id;
  SELECT EXTRACT(YEAR FROM CURRENT_DATE)::varchar INTO v_year;
  SELECT COUNT(*) + 1 INTO v_count FROM payment_orders WHERE project_id = p_project_id;
  
  RETURN COALESCE(v_project_code, 'PROJ') || '-OP-' || v_year || '-' || LPAD(v_count::varchar, 4, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_payment_order_number(uuid) IS 'Genera el siguiente número de orden de pago para un proyecto';

-- Función para auto-generar informe quincenal
CREATE OR REPLACE FUNCTION auto_generate_biweekly_report(p_project_id uuid)
RETURNS uuid AS $$
DECLARE
  v_report_id uuid;
  v_period_start date;
  v_period_end date;
  v_report_frequency text;
  v_created_by uuid;
BEGIN
  -- Obtener frecuencia del proyecto
  SELECT report_frequency, created_by INTO v_report_frequency, v_created_by 
  FROM projects 
  WHERE id = p_project_id;
  
  v_period_end := CURRENT_DATE;
  v_period_start := CASE 
    WHEN v_report_frequency = 'biweekly' THEN v_period_end - interval '15 days'
    WHEN v_report_frequency = 'monthly' THEN v_period_end - interval '1 month'
    ELSE v_period_end - interval '7 days'
  END;
  
  -- Crear informe en estado draft
  INSERT INTO reports (
    project_id, 
    title, 
    report_frequency,
    period_start, 
    period_end, 
    status,
    created_by,
    version
  )
  VALUES (
    p_project_id,
    CASE 
      WHEN v_report_frequency = 'biweekly' THEN 'Informe Quincenal '
      WHEN v_report_frequency = 'monthly' THEN 'Informe Mensual '
      ELSE 'Informe Semanal '
    END || TO_CHAR(v_period_end, 'DD/MM/YYYY'),
    v_report_frequency,
    v_period_start,
    v_period_end,
    'draft',
    v_created_by,
    1
  )
  RETURNING id INTO v_report_id;
  
  RAISE NOTICE 'Informe % generado automáticamente para proyecto %', v_report_id, p_project_id;
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_generate_biweekly_report(uuid) IS 'Genera automáticamente un informe según la frecuencia del proyecto';

-- Función para proceso de firma automática
CREATE OR REPLACE FUNCTION process_automatic_signatures(p_report_id uuid)
RETURNS boolean AS $$
DECLARE
  v_project_id uuid;
  v_signature_order text[];
  v_order_item text;
  v_order_num integer := 1;
  v_user_id uuid;
  v_signature_url text;
BEGIN
  -- Obtener configuración de firmas
  SELECT r.project_id, rc.auto_signature_order 
  INTO v_project_id, v_signature_order
  FROM reports r
  INNER JOIN report_configurations rc ON rc.project_id = r.project_id
  WHERE r.id = p_report_id;
  
  -- Procesar cada firma en orden
  FOREACH v_order_item IN ARRAY v_signature_order
  LOOP
    v_user_id := NULL;
    v_signature_url := NULL;
    
    IF v_order_item = 'residente' THEN
      -- Buscar residente del proyecto
      SELECT pm.user_id, prof.signature_url
      INTO v_user_id, v_signature_url
      FROM project_members pm
      INNER JOIN profiles prof ON prof.id = pm.user_id
      WHERE pm.project_id = v_project_id 
        AND pm.role_in_project = 'residente'
        AND pm.is_active = true
      LIMIT 1;
      
    ELSIF v_order_item = 'supervisor' THEN
      -- Buscar supervisor del proyecto
      SELECT pm.user_id, prof.signature_url
      INTO v_user_id, v_signature_url
      FROM project_members pm
      INNER JOIN profiles prof ON prof.id = pm.user_id
      WHERE pm.project_id = v_project_id 
        AND pm.role_in_project = 'supervisor'
        AND pm.is_active = true
      LIMIT 1;
      
    ELSIF v_order_item = 'gerente' THEN
      -- Buscar gerente activo
      SELECT id, signature_url
      INTO v_user_id, v_signature_url
      FROM profiles
      WHERE role = 'gerente'
        AND is_active = true
      LIMIT 1;
    END IF;
    
    -- Insertar firma si hay usuario y firma
    IF v_user_id IS NOT NULL THEN
      INSERT INTO report_signatures (
        report_id,
        user_id,
        signature_order,
        signature_type,
        user_role,
        signature_data,
        signed_at
      ) VALUES (
        p_report_id,
        v_user_id,
        v_order_num,
        'automatic',
        v_order_item,
        COALESCE(v_signature_url, 'pending'),
        CASE WHEN v_signature_url IS NOT NULL THEN NOW() ELSE NULL END
      )
      ON CONFLICT (report_id, user_id) DO UPDATE
      SET signature_order = EXCLUDED.signature_order,
          signed_at = EXCLUDED.signed_at;
      
      v_order_num := v_order_num + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Firmas automáticas procesadas para informe %', p_report_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_automatic_signatures(uuid) IS 'Procesa las firmas automáticas según el orden configurado';

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar last_activity_at en proyectos
CREATE OR REPLACE FUNCTION update_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects 
  SET last_activity_at = NOW() 
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_log_activity ON daily_logs;
CREATE TRIGGER trigger_daily_log_activity
AFTER INSERT OR UPDATE ON daily_logs
FOR EACH ROW EXECUTE FUNCTION update_project_activity();

DROP TRIGGER IF EXISTS trigger_report_activity ON reports;
CREATE TRIGGER trigger_report_activity
AFTER INSERT OR UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION update_project_activity();

COMMENT ON FUNCTION update_project_activity() IS 'Actualiza last_activity_at cuando hay actividad en el proyecto';

-- Trigger para sincronización offline
CREATE OR REPLACE FUNCTION handle_daily_log_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sync_status = 'synced' AND OLD.sync_status != 'synced' THEN
    NEW.last_synced_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_log_sync ON daily_logs;
CREATE TRIGGER trigger_daily_log_sync
BEFORE UPDATE ON daily_logs
FOR EACH ROW EXECUTE FUNCTION handle_daily_log_sync();

COMMENT ON FUNCTION handle_daily_log_sync() IS 'Actualiza timestamp de sincronización cuando un log se sincroniza';

-- Trigger para proceso de aprobación de informes
CREATE OR REPLACE FUNCTION handle_report_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el supervisor aprobó el informe
  IF NEW.status = 'approved' AND OLD.status = 'pending_review' THEN
    -- Generar firmas automáticas (residente + supervisor)
    PERFORM process_automatic_signatures(NEW.id);
    
    -- Cambiar estado a pending_manager
    NEW.status := 'pending_manager';
    
    -- TODO: Crear notificación para gerente
    -- (se implementará en siguiente migración)
    
    RAISE NOTICE 'Informe % aprobado por supervisor, pendiente de gerente', NEW.id;
  END IF;
  
  -- Si el gerente firmó
  IF NEW.status = 'final' AND OLD.status = 'pending_manager' THEN
    NEW.shared_with_client := false; -- Aún no compartido
    RAISE NOTICE 'Informe % firmado por gerente, listo para compartir', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_report_approval ON reports;
CREATE TRIGGER trigger_report_approval
BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION handle_report_approval();

COMMENT ON FUNCTION handle_report_approval() IS 'Maneja el flujo de aprobación y firmas de informes';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_log_templates_updated_at ON daily_log_templates;
CREATE TRIGGER trigger_daily_log_templates_updated_at
BEFORE UPDATE ON daily_log_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_report_configurations_updated_at ON report_configurations;
CREATE TRIGGER trigger_report_configurations_updated_at
BEFORE UPDATE ON report_configurations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 'Actualiza automáticamente la columna updated_at';

-- ============================================
-- TRIGGERS PARA MÓDULO FINANCIERO
-- ============================================

-- Trigger para balance de cuentas fiduciarias
CREATE OR REPLACE FUNCTION update_fiduciary_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_new_balance numeric;
  v_old_balance numeric;
BEGIN
  SELECT current_balance INTO v_old_balance 
  FROM fiduciary_accounts 
  WHERE id = NEW.fiduciary_account_id;
  
  IF NEW.movement_type = 'credit' THEN
    v_new_balance := v_old_balance + NEW.amount;
  ELSE
    v_new_balance := v_old_balance - NEW.amount;
  END IF;
  
  NEW.balance_before := v_old_balance;
  NEW.balance_after := v_new_balance;
  
  UPDATE fiduciary_accounts
  SET current_balance = v_new_balance
  WHERE id = NEW.fiduciary_account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_balance ON fiduciary_movements;
CREATE TRIGGER trigger_update_balance
BEFORE INSERT ON fiduciary_movements
FOR EACH ROW EXECUTE FUNCTION update_fiduciary_balance();

COMMENT ON FUNCTION update_fiduciary_balance() IS 'Actualiza el balance de cuenta fiduciaria al registrar movimiento';

-- Trigger para crear movimiento al pagar orden
CREATE OR REPLACE FUNCTION create_payment_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pagado' AND (OLD.status IS NULL OR OLD.status != 'pagado') THEN
    INSERT INTO fiduciary_movements (
      fiduciary_account_id,
      payment_order_id,
      movement_type,
      amount,
      description,
      reference_number,
      created_by
    ) VALUES (
      NEW.fiduciary_account_id,
      NEW.id,
      'debit',
      NEW.amount,
      'Pago de orden ' || NEW.order_number || ' - ' || NEW.concept,
      NEW.order_number,
      NEW.approved_by
    );
    
    NEW.paid_at := NOW();
    
    RAISE NOTICE 'Movimiento creado para orden de pago %', NEW.order_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_movement ON payment_orders;
CREATE TRIGGER trigger_payment_movement
BEFORE UPDATE ON payment_orders
FOR EACH ROW EXECUTE FUNCTION create_payment_movement();

COMMENT ON FUNCTION create_payment_movement() IS 'Crea movimiento fiduciario al marcar orden de pago como pagada';

-- ============================================
-- VALIDACIÓN FINAL
-- ============================================

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Verificar que las funciones se crearon
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname IN (
    'get_user_role',
    'has_capability',
    'is_project_member',
    'auto_generate_biweekly_report',
    'process_automatic_signatures',
    'update_project_activity',
    'handle_daily_log_sync',
    'handle_report_approval',
    'update_fiduciary_balance',
    'create_payment_movement'
  );
  
  IF v_count < 10 THEN
    RAISE WARNING 'No se crearon todas las funciones esperadas (creadas: %)', v_count;
  END IF;
  
  -- Verificar que los triggers se crearon
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger
  WHERE tgname IN (
    'trigger_daily_log_activity',
    'trigger_report_activity',
    'trigger_daily_log_sync',
    'trigger_report_approval',
    'trigger_daily_log_templates_updated_at',
    'trigger_report_configurations_updated_at',
    'trigger_update_balance',
    'trigger_payment_movement'
  );
  
  IF v_count < 8 THEN
    RAISE WARNING 'No se crearon todos los triggers esperados (creados: %)', v_count;
  END IF;
  
  RAISE NOTICE '✅ Migración 015 completada exitosamente';
  RAISE NOTICE 'Funciones creadas: 10';
  RAISE NOTICE 'Triggers creados: 8';
  RAISE NOTICE 'Próximo paso: Ejecutar migración 016 (políticas RLS)';
END $$;

COMMIT;
