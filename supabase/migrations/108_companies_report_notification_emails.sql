-- =====================================================
-- MIGRACIÓN 108: CORREOS DE NOTIFICACIÓN DE INFORMES POR EMPRESA
-- =====================================================
-- Correos de la empresa cliente que recibirán los informes publicados cuando
-- la plataforma los envíe (lo podrá hacer gerencia o supervisión).
--
-- Aditiva e idempotente: columna nueva con valor por defecto vacío; no cambia
-- datos existentes ni políticas.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS report_notification_emails TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN companies.report_notification_emails IS
  'Correos que reciben los informes publicados de los proyectos de esta empresa.';

NOTIFY pgrst, 'reload schema';
