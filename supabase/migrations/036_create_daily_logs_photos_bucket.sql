-- =====================================================
-- MIGRACIÓN 036: CREAR BUCKET PARA FOTOS DE BITÁCORAS
-- =====================================================
-- Bucket para almacenar fotos del registro fotográfico de bitácoras diarias

-- Crear bucket para fotos de bitácoras
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'daily-logs-photos',
  'daily-logs-photos',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en storage.objects si no está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública de fotos de bitácoras
CREATE POLICY "Public read access for daily logs photos" ON storage.objects
FOR SELECT USING (bucket_id = 'daily-logs-photos');

-- Política para permitir subida a usuarios autenticados
CREATE POLICY "Authenticated users can upload daily logs photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'daily-logs-photos' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir actualización solo de archivos propios
CREATE POLICY "Users can update their own daily logs photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'daily-logs-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir eliminación de archivos propios o por admins
CREATE POLICY "Users can delete their own daily logs photos or admins can delete any" ON storage.objects
FOR DELETE USING (
  bucket_id = 'daily-logs-photos' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  )
);
