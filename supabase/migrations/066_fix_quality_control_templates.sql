-- =====================================================
-- MIGRACIÓN 066: CORREGIR quality_control_templates
-- =====================================================
-- Eliminar dependencia de company_id si la tabla existe

-- 1. Solo ejecutar si la tabla existe
DO $$ 
BEGIN
  -- Verificar si la tabla existe
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quality_control_templates'
  ) THEN
    
    -- Agregar columna is_global si no existe
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'quality_control_templates' 
      AND column_name = 'is_global'
    ) THEN
      ALTER TABLE quality_control_templates 
      ADD COLUMN is_global BOOLEAN DEFAULT false;
    END IF;
    
    -- Migrar datos solo si existe company_id
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'quality_control_templates' 
      AND column_name = 'company_id'
    ) THEN
      UPDATE quality_control_templates 
      SET is_global = true 
      WHERE company_id IS NULL;
    END IF;
    
    -- Eliminar constraint UNIQUE viejo si existe
    ALTER TABLE quality_control_templates 
    DROP CONSTRAINT IF EXISTS quality_control_templates_company_id_template_name_key;
    
    -- Agregar nuevo constraint UNIQUE
    ALTER TABLE quality_control_templates 
    ADD CONSTRAINT quality_control_templates_template_name_key UNIQUE (template_name);
    
    -- Hacer company_id nullable si existe
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'quality_control_templates' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE quality_control_templates 
      ALTER COLUMN company_id DROP NOT NULL;
    END IF;
    
    -- Eliminar índice viejo
    DROP INDEX IF EXISTS idx_qc_templates_company;
    
    -- Crear nuevo índice
    CREATE INDEX IF NOT EXISTS idx_qc_templates_global 
    ON quality_control_templates(is_global) WHERE is_global = true;
    
    -- Actualizar política RLS
    DROP POLICY IF EXISTS "Users can view templates of their company" ON quality_control_templates;
    DROP POLICY IF EXISTS "Users can view templates" ON quality_control_templates;
    
    CREATE POLICY "Users can view templates"
      ON quality_control_templates FOR SELECT
      TO authenticated
      USING (
        is_global = true 
        OR created_by = auth.uid()
      );
    
  END IF;
END $$;
