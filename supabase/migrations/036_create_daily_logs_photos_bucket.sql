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

-- Política: Usuarios autenticados pueden subir fotos
CREATE POLICY "Authenticated users can upload daily log photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'daily-logs-photos'
  AND auth.role() = 'authenticated'
);

-- Política: Todos pueden ver las fotos (bucket público)
CREATE POLICY "Anyone can view daily log photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'daily-logs-photos');

-- Política: Usuarios pueden actualizar sus propias fotos
CREATE POLICY "Users can update their own daily log photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'daily-logs-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'daily-logs-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuarios pueden eliminar sus propias fotos o admins pueden eliminar cualquiera
CREATE POLICY "Users can delete their own daily log photos or admins can delete any"
ON storage.objects FOR DELETE TO authenticated
USING (
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

-- Comentarios
COMMENT ON POLICY "Authenticated users can upload daily log photos" ON storage.objects IS 
'Usuarios autenticados pueden subir fotos de bitácoras';

COMMENT ON POLICY "Anyone can view daily log photos" ON storage.objects IS 
'Todos pueden ver fotos de bitácoras (bucket público)';

COMMENT ON POLICY "Users can update their own daily log photos" ON storage.objects IS 
'Usuarios pueden actualizar sus propias fotos de bitácoras';

COMMENT ON POLICY "Users can delete their own daily log photos or admins can delete any" ON storage.objects IS 
'Usuarios pueden eliminar sus propias fotos, admins pueden eliminar cualquiera';
