-- =====================================================
-- Migration: 014 - Enhanced Structure (Claude System)
-- Description: Estructura base para sistema mejorado
-- Mantiene 6 roles existentes + agrega funcionalidades
-- Date: 2025-10-08
-- =====================================================

BEGIN;

-- ============================================
-- PASO 1: BACKUP DE SEGURIDAD
-- ============================================

CREATE SCHEMA IF NOT EXISTS backup_migration_014;

-- Crear backups de tablas críticas
DO $$
BEGIN
  EXECUTE 'CREATE TABLE IF NOT EXISTS backup_migration_014.profiles_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS') || ' AS SELECT * FROM profiles';
  EXECUTE 'CREATE TABLE IF NOT EXISTS backup_migration_014.projects_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS') || ' AS SELECT * FROM projects';
  EXECUTE 'CREATE TABLE IF NOT EXISTS backup_migration_014.reports_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS') || ' AS SELECT * FROM reports';
  EXECUTE 'CREATE TABLE IF NOT EXISTS backup_migration_014.daily_logs_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS') || ' AS SELECT * FROM daily_logs';
  
  RAISE NOTICE 'Backups creados en schema backup_migration_014';
END $$;

-- ============================================
-- PASO 2: VERIFICAR Y MANTENER ROLES
-- ============================================

-- Asegurar que el constraint de roles incluye los 6 roles
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check CHECK (
  role = ANY (ARRAY[
    'super_admin'::text,
    'admin'::text,
    'gerente'::text,
    'supervisor'::text,
    'residente'::text,
    'cliente'::text
  ])
);

COMMENT ON CONSTRAINT profiles_role_check ON profiles IS 
  'Roles: super_admin (dev), admin (Yuliana), gerente (Adriana), supervisor (Santiago), residente, cliente';

-- ============================================
-- PASO 3: TABLA ROLE_CAPABILITIES
-- ============================================

CREATE TABLE IF NOT EXISTS role_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'gerente', 'supervisor', 'residente', 'cliente')),
  capability text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, capability)
);

COMMENT ON TABLE role_capabilities IS 'Define qué puede hacer cada rol en el sistema';

-- Poblar capacidades
INSERT INTO role_capabilities (role, capability, description) VALUES
-- SUPER_ADMIN
('super_admin', 'view_all', 'Ver toda la información del sistema'),
('super_admin', 'manage_users', 'Gestionar usuarios y permisos'),
('super_admin', 'view_metrics', 'Ver métricas de rendimiento'),
('super_admin', 'manage_companies', 'Crear y modificar empresas'),
('super_admin', 'manage_projects', 'Crear y modificar proyectos'),
('super_admin', 'manage_financial', 'Acceso completo al módulo financiero'),

-- ADMIN (Yuliana)
('admin', 'manage_companies', 'Crear y modificar empresas cliente'),
('admin', 'manage_projects', 'Crear y modificar proyectos'),
('admin', 'view_all_projects', 'Ver todos los proyectos'),
('admin', 'manage_financial', 'Gestionar módulo financiero'),
('admin', 'create_payment_orders', 'Crear órdenes de pago'),
('admin', 'manage_fiduciary_accounts', 'Gestionar cuentas fiduciarias'),

-- GERENTE (Adriana)
('gerente', 'view_all_projects', 'Ver todos los proyectos'),
('gerente', 'view_company_dashboard', 'Dashboard empresarial'),
('gerente', 'sign_reports', 'Firmar informes finales'),
('gerente', 'view_financial_summary', 'Ver resumen financiero'),
('gerente', 'approve_final_reports', 'Aprobar informes para cliente'),

-- SUPERVISOR (Santiago)
('supervisor', 'manage_assigned_projects', 'Gestionar proyectos asignados'),
('supervisor', 'create_projects', 'Crear nuevos proyectos'),
('supervisor', 'assign_residents', 'Asignar residentes'),
('supervisor', 'configure_daily_log_templates', 'Configurar plantillas de bitácora'),
('supervisor', 'review_reports', 'Revisar y aprobar informes'),
('supervisor', 'request_corrections', 'Solicitar correcciones'),

-- RESIDENTE
('residente', 'create_daily_logs', 'Crear bitácoras diarias'),
('residente', 'upload_photos', 'Subir fotos a bitácoras'),
('residente', 'view_assigned_project', 'Ver proyecto asignado'),
('residente', 'sync_offline_data', 'Sincronizar datos offline'),

-- CLIENTE
('cliente', 'view_assigned_projects', 'Ver proyectos contratados'),
('cliente', 'view_shared_reports', 'Ver informes compartidos'),
('cliente', 'view_project_progress', 'Ver avance de proyectos')
ON CONFLICT (role, capability) DO NOTHING;

-- ============================================
-- PASO 4: MEJORAR TABLA COMPANIES
-- ============================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS tax_id_type text DEFAULT 'NIT',
ADD COLUMN IF NOT EXISTS company_size text CHECK (company_size IN ('small', 'medium', 'large', 'enterprise')),
ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN companies.industry IS 'Industria o sector de la empresa';
COMMENT ON COLUMN companies.company_size IS 'Tamaño: small, medium, large, enterprise';

-- ============================================
-- PASO 5: MEJORAR TABLA PROJECTS
-- ============================================

-- Agregar service_type (tipo de servicio)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'technical' 
  CHECK (service_type IN ('technical', 'technical_financial'));

UPDATE projects SET service_type = 'technical' WHERE service_type IS NULL;

COMMENT ON COLUMN projects.service_type IS 'technical = solo técnico, technical_financial = técnico + financiero';

-- Agregar campos de informes
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS report_frequency text DEFAULT 'biweekly' 
  CHECK (report_frequency IN ('weekly', 'biweekly', 'monthly')),
ADD COLUMN IF NOT EXISTS next_report_date date,
ADD COLUMN IF NOT EXISTS auto_generate_reports boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

COMMENT ON COLUMN projects.report_frequency IS 'Frecuencia de generación de informes: weekly, biweekly, monthly';
COMMENT ON COLUMN projects.auto_generate_reports IS 'Si true, genera informes automáticamente según frecuencia';

-- ============================================
-- PASO 6: TABLA DAILY_LOG_TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS daily_log_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_name text NOT NULL DEFAULT 'Plantilla Principal',
  base_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  field_mapping jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_daily_log_templates_project ON daily_log_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_templates_active ON daily_log_templates(is_active);

COMMENT ON TABLE daily_log_templates IS 'Plantillas configurables para bitácoras (80% base + 20% custom)';
COMMENT ON COLUMN daily_log_templates.base_fields IS '80% campos predefinidos del sistema';
COMMENT ON COLUMN daily_log_templates.custom_fields IS '20% campos personalizables por proyecto';
COMMENT ON COLUMN daily_log_templates.field_mapping IS 'Mapeo de campos a secciones del informe';

-- Crear plantilla base para proyectos existentes
INSERT INTO daily_log_templates (project_id, template_name, base_fields, custom_fields, created_by)
SELECT 
  id,
  'Plantilla Base',
  jsonb_build_array(
    jsonb_build_object('id', 'weather', 'label', 'Clima', 'type', 'select', 
      'options', jsonb_build_array('Soleado', 'Nublado', 'Lluvioso'), 
      'required', true, 'report_section', 'conditions'),
    jsonb_build_object('id', 'temperature', 'label', 'Temperatura (°C)', 'type', 'number', 
      'required', false, 'report_section', 'conditions'),
    jsonb_build_object('id', 'personnel_count', 'label', 'Personal en Obra', 'type', 'number', 
      'required', true, 'report_section', 'personnel'),
    jsonb_build_object('id', 'activities', 'label', 'Actividades Realizadas', 'type', 'textarea', 
      'required', true, 'report_section', 'activities'),
    jsonb_build_object('id', 'materials', 'label', 'Materiales Utilizados', 'type', 'textarea', 
      'required', false, 'report_section', 'resources'),
    jsonb_build_object('id', 'observations', 'label', 'Observaciones', 'type', 'textarea', 
      'required', false, 'report_section', 'observations')
  ),
  '[]'::jsonb,
  created_by
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM daily_log_templates WHERE project_id = projects.id
)
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 7: MEJORAR TABLA DAILY_LOGS
-- ============================================

ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES daily_log_templates(id),
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced' 
  CHECK (sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
ADD COLUMN IF NOT EXISTS offline_created_at timestamptz,
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
ADD COLUMN IF NOT EXISTS device_id text;

COMMENT ON COLUMN daily_logs.sync_status IS 'Estado de sincronización para modo offline';
COMMENT ON COLUMN daily_logs.offline_created_at IS 'Timestamp de creación offline';
COMMENT ON COLUMN daily_logs.device_id IS 'ID del dispositivo que creó el log offline';

-- Asignar template por defecto
UPDATE daily_logs dl
SET template_id = (
  SELECT id FROM daily_log_templates dlt 
  WHERE dlt.project_id = dl.project_id 
  LIMIT 1
)
WHERE template_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_logs_template ON daily_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_sync_status ON daily_logs(sync_status);

-- ============================================
-- PASO 8: TABLA REPORT_CONFIGURATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS report_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  template_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  company_letterhead_url text,
  include_photos boolean DEFAULT true,
  include_weather boolean DEFAULT true,
  include_personnel boolean DEFAULT true,
  auto_signature_order text[] DEFAULT ARRAY['residente', 'supervisor', 'gerente'],
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_configurations_project ON report_configurations(project_id);

COMMENT ON TABLE report_configurations IS 'Configuración de estructura y generación de informes por proyecto';
COMMENT ON COLUMN report_configurations.auto_signature_order IS 'Orden de firmas automáticas';

-- Crear configuración por defecto
INSERT INTO report_configurations (project_id, sections, auto_signature_order, created_by)
SELECT 
  id,
  jsonb_build_array(
    jsonb_build_object('id', 'cover', 'title', 'Portada', 'order', 1),
    jsonb_build_object('id', 'executive_summary', 'title', 'Resumen Ejecutivo', 'order', 2),
    jsonb_build_object('id', 'conditions', 'title', 'Condiciones Climáticas', 'order', 3),
    jsonb_build_object('id', 'personnel', 'title', 'Personal en Obra', 'order', 4),
    jsonb_build_object('id', 'activities', 'title', 'Actividades Realizadas', 'order', 5),
    jsonb_build_object('id', 'progress', 'title', 'Avance de Obra', 'order', 6),
    jsonb_build_object('id', 'photos', 'title', 'Registro Fotográfico', 'order', 7),
    jsonb_build_object('id', 'signatures', 'title', 'Firmas', 'order', 8)
  ),
  ARRAY['residente', 'supervisor', 'gerente'],
  created_by
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM report_configurations WHERE project_id = projects.id
)
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 9: MEJORAR TABLA REPORTS
-- ============================================

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS report_frequency text DEFAULT 'biweekly'
  CHECK (report_frequency IN ('biweekly', 'monthly')),
ADD COLUMN IF NOT EXISTS shared_with_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS correction_notes text,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_report_id uuid REFERENCES reports(id);

COMMENT ON COLUMN reports.shared_with_client IS 'Si el informe ha sido compartido con el cliente';
COMMENT ON COLUMN reports.version IS 'Versión del informe (incrementa con correcciones)';
COMMENT ON COLUMN reports.parent_report_id IS 'ID del informe padre si es una corrección';

-- Actualizar constraint de status (manejar tipo existente)
DO $$
BEGIN
  -- Eliminar constraint anterior si existe
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
  
  -- Si status es un enum, convertirlo a text primero
  IF EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = 'report_status'
  ) THEN
    ALTER TABLE reports ALTER COLUMN status TYPE text USING status::text;
    DROP TYPE IF EXISTS report_status CASCADE;
  END IF;
  
  -- Agregar nuevo constraint
  ALTER TABLE reports
  ADD CONSTRAINT reports_status_check CHECK (
    status = ANY (ARRAY[
      'draft'::text,
      'pending_review'::text,
      'corrections'::text,
      'approved'::text,
      'pending_manager'::text,
      'final'::text,
      'shared'::text
    ])
  );
  
  RAISE NOTICE 'Constraint de status actualizado correctamente';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error actualizando constraint de status: %', SQLERRM;
END $$;

COMMENT ON COLUMN reports.status IS 
  'Flujo: draft → pending_review → approved → pending_manager → final → shared';

-- ============================================
-- PASO 10: MEJORAR TABLA REPORT_SIGNATURES
-- ============================================

ALTER TABLE report_signatures
ADD COLUMN IF NOT EXISTS signature_order integer,
ADD COLUMN IF NOT EXISTS signature_type text DEFAULT 'automatic' 
  CHECK (signature_type IN ('automatic', 'manual')),
ADD COLUMN IF NOT EXISTS user_role text,
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;

COMMENT ON COLUMN report_signatures.signature_type IS 'automatic = firma PNG automática, manual = firma digital';
COMMENT ON COLUMN report_signatures.signature_order IS 'Orden en que se firmó (1, 2, 3...)';

-- ============================================
-- PASO 11: TABLA DASHBOARD_WIDGETS
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'gerente', 'supervisor', 'residente', 'cliente')),
  widget_type text NOT NULL CHECK (widget_type IN ('chart', 'metric', 'table', 'map', 'list')),
  widget_config jsonb NOT NULL,
  position jsonb DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 4}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_role ON dashboard_widgets(role);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_active ON dashboard_widgets(is_active);

COMMENT ON TABLE dashboard_widgets IS 'Widgets configurables para dashboards personalizados por rol';

-- Poblar widgets por rol (solo los esenciales)
INSERT INTO dashboard_widgets (role, widget_type, widget_config, position) VALUES
-- SUPER_ADMIN
('super_admin', 'metric', '{"title": "Total Usuarios", "source": "profiles", "aggregation": "count"}', '{"x": 0, "y": 0, "w": 3, "h": 2}'),
('super_admin', 'metric', '{"title": "Proyectos Activos", "source": "projects", "filter": {"is_archived": false}, "aggregation": "count"}', '{"x": 3, "y": 0, "w": 3, "h": 2}'),

-- ADMIN (Yuliana)
('admin', 'metric', '{"title": "Total Empresas", "source": "companies", "aggregation": "count"}', '{"x": 0, "y": 0, "w": 3, "h": 2}'),
('admin', 'metric', '{"title": "Total Proyectos", "source": "projects", "aggregation": "count"}', '{"x": 3, "y": 0, "w": 3, "h": 2}'),
('admin', 'metric', '{"title": "Proyectos con Financiero", "source": "projects", "filter": {"service_type": "technical_financial"}, "aggregation": "count"}', '{"x": 6, "y": 0, "w": 3, "h": 2}'),

-- GERENTE (Adriana)
('gerente', 'metric', '{"title": "Proyectos Totales", "source": "projects", "aggregation": "count"}', '{"x": 0, "y": 0, "w": 3, "h": 2}'),
('gerente', 'metric', '{"title": "Informes para Firmar", "source": "reports", "filter": {"status": "pending_manager"}, "aggregation": "count"}', '{"x": 3, "y": 0, "w": 3, "h": 2}'),

-- SUPERVISOR (Santiago)
('supervisor', 'metric', '{"title": "Mis Proyectos", "source": "project_members", "filter": {"user_id": "$current_user"}, "aggregation": "count"}', '{"x": 0, "y": 0, "w": 4, "h": 2}'),
('supervisor', 'metric', '{"title": "Informes para Revisar", "source": "reports", "filter": {"status": "pending_review"}, "aggregation": "count"}', '{"x": 4, "y": 0, "w": 4, "h": 2}'),

-- RESIDENTE
('residente', 'metric', '{"title": "Mi Proyecto", "source": "project_members", "filter": {"user_id": "$current_user"}, "aggregation": "count"}', '{"x": 0, "y": 0, "w": 6, "h": 2}'),
('residente', 'metric', '{"title": "Bitácoras Este Mes", "source": "daily_logs", "filter": {"created_by": "$current_user"}, "aggregation": "count"}', '{"x": 6, "y": 0, "w": 6, "h": 2}'),

-- CLIENTE
('cliente', 'metric', '{"title": "Mis Proyectos", "source": "projects", "aggregation": "count"}', '{"x": 0, "y": 0, "w": 6, "h": 2}'),
('cliente', 'metric', '{"title": "Informes Compartidos", "source": "reports", "filter": {"shared_with_client": true}, "aggregation": "count"}', '{"x": 6, "y": 0, "w": 6, "h": 2}')
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 12: ÍNDICES ADICIONALES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_projects_service_type ON projects(service_type);
CREATE INDEX IF NOT EXISTS idx_projects_report_frequency ON projects(report_frequency);
CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON projects(is_archived);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_shared_with_client ON reports(shared_with_client);

-- ============================================
-- PASO 13: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON SCHEMA backup_migration_014 IS 'Backups de migración 014 - Sistema mejorado';

-- ============================================
-- PASO 14: VALIDACIÓN FINAL
-- ============================================

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Verificar que las tablas se crearon
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_name IN ('role_capabilities', 'daily_log_templates', 'report_configurations', 'dashboard_widgets');
  
  IF v_count < 4 THEN
    RAISE EXCEPTION 'No se crearon todas las tablas necesarias';
  END IF;
  
  -- Verificar que hay capacidades
  SELECT COUNT(*) INTO v_count FROM role_capabilities;
  IF v_count < 20 THEN
    RAISE WARNING 'Se esperaban más capacidades de rol';
  END IF;
  
  -- Verificar que hay widgets
  SELECT COUNT(*) INTO v_count FROM dashboard_widgets;
  IF v_count < 10 THEN
    RAISE WARNING 'Se esperaban más widgets';
  END IF;
  
  RAISE NOTICE '✅ Migración 014 completada exitosamente';
  RAISE NOTICE 'Tablas creadas: role_capabilities, daily_log_templates, report_configurations, dashboard_widgets';
  RAISE NOTICE 'Tablas mejoradas: companies, projects, daily_logs, reports, report_signatures';
  RAISE NOTICE 'Próximo paso: Ejecutar migración 015 (funciones y triggers)';
END $$;

COMMIT;
