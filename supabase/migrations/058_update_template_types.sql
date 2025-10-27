-- =====================================================
-- MIGRACIÓN 058: ACTUALIZAR TIPOS DE PLANTILLAS
-- =====================================================
-- Actualizar el CHECK constraint para incluir los nuevos tipos de informes

-- 1. Eliminar el constraint antiguo
ALTER TABLE report_templates 
DROP CONSTRAINT IF EXISTS report_templates_template_type_check;

-- 2. Agregar el nuevo constraint con todos los tipos
ALTER TABLE report_templates
ADD CONSTRAINT report_templates_template_type_check 
CHECK (template_type IN (
  -- Tipos de Interventoría
  'interventoria_administrativa',
  'supervision_tecnica',
  -- Tipos de Bitácora
  'bitacora_diaria',
  'bitacora_semanal',
  'bitacora_mensual',
  -- Tipos legacy (mantener compatibilidad)
  'daily_log',
  'financial',
  'general',
  -- Personalizado
  'custom'
));

-- 3. Verificar el constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'report_templates'::regclass
  AND conname = 'report_templates_template_type_check';

-- Comentario
COMMENT ON CONSTRAINT report_templates_template_type_check ON report_templates 
IS 'Tipos permitidos: interventoria_administrativa, supervision_tecnica, bitacora_diaria, bitacora_semanal, bitacora_mensual, daily_log, financial, general, custom';
