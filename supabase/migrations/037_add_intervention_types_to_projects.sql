-- =====================================================
-- MIGRACIÓN 037: AGREGAR TIPOS DE INTERVENCIÓN A PROYECTOS
-- =====================================================
-- Permitir múltiples tipos de intervención por proyecto

-- Agregar columnas para tipos de intervención
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS intervention_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS intervention_types_other TEXT;

-- Comentarios
COMMENT ON COLUMN projects.intervention_types IS 
'Tipos de intervención del proyecto. Valores permitidos: 
- sti_continua: Supervisión Técnica Independiente (STI) Continua
- sti_itinerante: Supervisión Técnica Independiente (STI) Itinerante
- interventoria_desembolsos: Interventoría de Desembolsos
- interventoria: Interventoría
- interventoria_itinerante: Interventoría Itinerante
- otro: Otro (ver intervention_types_other)';

COMMENT ON COLUMN projects.intervention_types_other IS 
'Descripción personalizada cuando se selecciona "otro" en intervention_types';

-- Migrar datos existentes si hay proyectos con intervention_type antiguo
-- (Asumiendo que tenían un campo intervention_type que era "Interventoría Administrativa")
UPDATE projects 
SET intervention_types = ARRAY['interventoria_desembolsos']
WHERE intervention_types = '{}' 
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'intervention_type'
  );
