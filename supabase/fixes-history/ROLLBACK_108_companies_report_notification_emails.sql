-- =====================================================
-- ROLLBACK MIGRACIÓN 108
-- =====================================================
-- Elimina los correos de notificación de informes de las empresas. Antes de
-- ejecutarlo, respaldar los datos:
--   SELECT id, name, report_notification_emails FROM companies
--   WHERE cardinality(report_notification_emails) > 0;

ALTER TABLE companies DROP COLUMN IF EXISTS report_notification_emails;

NOTIFY pgrst, 'reload schema';
