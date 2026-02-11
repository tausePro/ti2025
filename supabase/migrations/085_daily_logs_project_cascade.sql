-- =====================================================
-- MIGRACIÓN 085: CASCADE EN FK daily_logs.project_id
-- Objetivo: permitir eliminación de proyectos demo sin errores
-- Seguro en producción: solo ajusta la FK si existe
-- =====================================================

BEGIN;

-- 1) Eliminar FK actual si existe
ALTER TABLE daily_logs
DROP CONSTRAINT IF EXISTS daily_logs_project_id_fkey;

-- 2) Crear FK con ON DELETE CASCADE
ALTER TABLE daily_logs
ADD CONSTRAINT daily_logs_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- 3) Ajustar FK en performance_metrics (si existe)
ALTER TABLE performance_metrics
DROP CONSTRAINT IF EXISTS performance_metrics_project_id_fkey;

ALTER TABLE performance_metrics
ADD CONSTRAINT performance_metrics_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- 4) Ajustar FK en fiduciary_accounts (si existe)
ALTER TABLE fiduciary_accounts
DROP CONSTRAINT IF EXISTS fiduciary_accounts_project_id_fkey;

ALTER TABLE fiduciary_accounts
ADD CONSTRAINT fiduciary_accounts_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- 5) Ajustar FK en reports (si existe)
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_project_id_fkey;

ALTER TABLE reports
ADD CONSTRAINT reports_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- 6) Ajustar FK en payment_orders (si existe)
ALTER TABLE payment_orders
DROP CONSTRAINT IF EXISTS payment_orders_project_id_fkey;

ALTER TABLE payment_orders
ADD CONSTRAINT payment_orders_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- 7) Ajustar FK en construction_acts (si existe)
ALTER TABLE construction_acts
DROP CONSTRAINT IF EXISTS construction_acts_project_id_fkey;

ALTER TABLE construction_acts
ADD CONSTRAINT construction_acts_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- 8) Ajustar FK en chat_messages (si existe)
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_project_id_fkey;

ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

COMMIT;
