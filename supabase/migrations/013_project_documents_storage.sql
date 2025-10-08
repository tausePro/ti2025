-- =====================================================
-- Migration: 013 - Project Documents Storage Setup
-- Description: Configurar storage bucket y políticas RLS para documentos de proyectos
-- Date: 2025-10-07
-- =====================================================

-- 1. Crear bucket para documentos de proyectos (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Storage para project-documents

-- Permitir a usuarios autenticados subir documentos
CREATE POLICY "Usuarios autenticados pueden subir documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-documents' AND
  auth.uid() IS NOT NULL
);

-- Permitir a usuarios ver documentos públicos
CREATE POLICY "Todos pueden ver documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-documents');

-- Permitir a usuarios eliminar sus propios documentos o si tienen permisos
CREATE POLICY "Usuarios pueden eliminar sus documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-documents' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  )
);

-- 3. Políticas RLS para tabla project_documents

-- Permitir a usuarios autenticados ver documentos de proyectos a los que tienen acceso
CREATE POLICY "Ver documentos de proyectos accesibles"
ON project_documents FOR SELECT
TO authenticated
USING (
  -- Super admins y admins ven todo
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Miembros del proyecto ven los documentos
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = project_documents.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.is_active = true
  )
  OR
  -- Documentos públicos son visibles para todos
  is_public = true
);

-- Permitir a miembros del proyecto subir documentos
CREATE POLICY "Miembros pueden subir documentos"
ON project_documents FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins y admins pueden subir
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Miembros activos del proyecto pueden subir
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = project_documents.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.is_active = true
  )
);

-- Permitir a admins y al uploader eliminar documentos
CREATE POLICY "Admins y uploader pueden eliminar documentos"
ON project_documents FOR DELETE
TO authenticated
USING (
  -- Super admins y admins pueden eliminar
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- El usuario que subió el documento puede eliminarlo
  uploaded_by = auth.uid()
);

-- Permitir actualizar documentos (descripción, is_public, etc.)
CREATE POLICY "Admins y uploader pueden actualizar documentos"
ON project_documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  uploaded_by = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  uploaded_by = auth.uid()
);

-- 4. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploader ON project_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_at ON project_documents(uploaded_at DESC);

-- 5. Comentarios
COMMENT ON TABLE project_documents IS 'Documentos asociados a proyectos (contratos, reportes, fotos, planos, etc.)';
COMMENT ON COLUMN project_documents.file_type IS 'Tipo de documento: logo, contract, report, photo, drawing, other';
COMMENT ON COLUMN project_documents.is_public IS 'Si es true, el documento es visible para todos los usuarios autenticados';
