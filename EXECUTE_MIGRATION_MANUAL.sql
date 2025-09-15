-- MIGRACIÓN MANUAL PARA EJECUTAR EN SUPABASE SQL EDITOR
-- Copia y pega este código en el SQL Editor de Supabase

-- 1. Agregar campos faltantes a la tabla projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS project_code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS estimated_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS actual_duration_days INTEGER;

-- 2. Actualizar el campo intervention_types para usar los valores correctos
ALTER TABLE projects 
ALTER COLUMN intervention_types TYPE TEXT[] USING intervention_types::TEXT[];

-- 3. Agregar estado 'planificacion' al enum de status
ALTER TABLE projects 
ALTER COLUMN status TYPE TEXT;

-- 4. Crear tabla project_members para gestión de equipo
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL CHECK (role_in_project IN ('supervisor', 'residente', 'ayudante', 'especialista')),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 5. Crear tabla project_documents para gestión de documentos
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('logo', 'contract', 'report', 'photo', 'drawing', 'other')),
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  description TEXT,
  is_public BOOLEAN DEFAULT false
);

-- 6. Crear tabla project_activities para seguimiento de actividades
CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'updated', 'status_changed', 'member_added', 'member_removed', 'document_uploaded', 'report_generated')),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_activity ON projects(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_project_members_active ON project_members(project_id, user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents(project_id, file_type);
CREATE INDEX IF NOT EXISTS idx_project_activities_project ON project_activities(project_id, created_at DESC);

-- 8. Crear función para actualizar last_activity_at
CREATE OR REPLACE FUNCTION update_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects 
  SET last_activity_at = NOW() 
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 9. Crear triggers para actualizar actividad
CREATE TRIGGER trigger_update_project_activity_members
  AFTER INSERT OR UPDATE OR DELETE ON project_members
  FOR EACH ROW EXECUTE FUNCTION update_project_activity();

CREATE TRIGGER trigger_update_project_activity_documents
  AFTER INSERT OR UPDATE OR DELETE ON project_documents
  FOR EACH ROW EXECUTE FUNCTION update_project_activity();

CREATE TRIGGER trigger_update_project_activity_activities
  AFTER INSERT ON project_activities
  FOR EACH ROW EXECUTE FUNCTION update_project_activity();

-- 10. Crear función para generar código de proyecto único
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  counter INTEGER := 1;
BEGIN
  LOOP
    new_code := 'PROJ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(counter::TEXT, 4, '0');
    
    IF NOT EXISTS (SELECT 1 FROM projects WHERE project_code = new_code) THEN
      RETURN new_code;
    END IF;
    
    counter := counter + 1;
    
    -- Prevenir bucle infinito
    IF counter > 9999 THEN
      RETURN 'PROJ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear trigger para generar código automático
CREATE OR REPLACE FUNCTION set_project_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_code IS NULL OR NEW.project_code = '' THEN
    NEW.project_code := generate_project_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_project_code
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION set_project_code();

-- 12. Crear políticas RLS para las nuevas tablas
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

-- Políticas para project_members
CREATE POLICY "Users can view project members of their projects" ON project_members
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE 
        created_by = auth.uid() OR
        id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all project members" ON project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Políticas para project_documents
CREATE POLICY "Users can view documents of their projects" ON project_documents
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE 
        created_by = auth.uid() OR
        id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload documents to their projects" ON project_documents
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE 
        created_by = auth.uid() OR
        id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

-- Políticas para project_activities
CREATE POLICY "Users can view activities of their projects" ON project_activities
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE 
        created_by = auth.uid() OR
        id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

-- 13. Crear vista para proyectos con información completa
CREATE OR REPLACE VIEW projects_with_details AS
SELECT 
  p.*,
  c.name as client_name,
  c.logo_url as client_logo,
  c.company_type as client_type,
  COUNT(DISTINCT pm.id) as team_size,
  COUNT(DISTINCT pd.id) as documents_count,
  COUNT(DISTINCT pa.id) as activities_count
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.is_active = true
LEFT JOIN project_documents pd ON p.id = pd.project_id
LEFT JOIN project_activities pa ON p.id = pa.project_id
WHERE p.is_archived = false
GROUP BY p.id, c.id;

-- 14. Comentarios para documentación
COMMENT ON TABLE project_members IS 'Gestión de equipo asignado a cada proyecto';
COMMENT ON TABLE project_documents IS 'Documentos y archivos asociados a proyectos';
COMMENT ON TABLE project_activities IS 'Registro de actividades y cambios en proyectos';
COMMENT ON COLUMN projects.progress_percentage IS 'Porcentaje de progreso del proyecto (0-100)';
COMMENT ON COLUMN projects.last_activity_at IS 'Última actividad registrada en el proyecto';
COMMENT ON COLUMN projects.project_code IS 'Código único del proyecto (ej: PROJ-2025-0001)';
COMMENT ON COLUMN project_members.role_in_project IS 'Rol específico del usuario en este proyecto';
COMMENT ON COLUMN project_documents.file_type IS 'Tipo de documento: logo, contract, report, photo, drawing, other';

-- 15. Verificar que todo se creó correctamente
SELECT 'Migration completed successfully!' as status;
