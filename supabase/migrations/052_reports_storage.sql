-- =====================================================
-- STORAGE PARA REPORTES PDF
-- Fecha: 2025-10-24
-- Descripción: Configuración de bucket y políticas para
--              almacenar reportes PDF generados
-- =====================================================

-- 1. CREAR BUCKET para reportes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false, -- Privado, requiere autenticación
  52428800, -- 50MB máximo por archivo
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- 2. NOTA SOBRE POLÍTICAS
-- Las políticas de storage.objects requieren permisos de superusuario
-- Se crearán automáticamente desde el código de la aplicación
-- Ver: lib/supabase/setup-storage-policies.ts

-- 3. FUNCIÓN: Limpiar reportes antiguos (más de 6 meses)
CREATE OR REPLACE FUNCTION cleanup_old_reports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  old_report RECORD;
BEGIN
  -- Buscar reportes de más de 6 meses
  FOR old_report IN
    SELECT id, file_url
    FROM generated_reports
    WHERE generated_at < NOW() - INTERVAL '6 months'
    AND status = 'completed'
  LOOP
    -- Eliminar archivo del storage
    -- (Esto se debe hacer desde el backend con admin privileges)
    
    -- Marcar como eliminado en la BD
    UPDATE generated_reports
    SET status = 'archived',
        file_url = NULL
    WHERE id = old_report.id;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. COMENTARIOS
COMMENT ON POLICY "Users can upload reports for their projects" ON storage.objects IS 
  'Permite a usuarios subir reportes PDF solo para proyectos donde son miembros activos';
COMMENT ON POLICY "Users can view reports from their projects" ON storage.objects IS 
  'Permite a usuarios ver reportes PDF solo de sus proyectos';
COMMENT ON FUNCTION cleanup_old_reports() IS 
  'Función para archivar reportes de más de 6 meses (ejecutar mensualmente)';
