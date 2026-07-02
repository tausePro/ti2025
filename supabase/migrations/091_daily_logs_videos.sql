-- =====================================================
-- MIGRACIÓN 091: VIDEOS EN BITÁCORAS DIARIAS
-- =====================================================
-- Permite adjuntar videos cortos de obra a las bitácoras:
--   - Nueva columna daily_logs.videos (URLs públicas en Storage).
--   - Bucket público daily-logs-videos (máx. 50MB por archivo).
--   - Políticas RLS equivalentes a las de fotos (042).
-- Los videos NO se embeben en el PDF: se listan como anexos con enlace.
-- =====================================================

-- 1. Columna para URLs de videos
ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS videos TEXT[];

COMMENT ON COLUMN daily_logs.videos IS 'URLs de videos subidos a Supabase Storage (bucket daily-logs-videos)';

-- 2. Crear/asegurar bucket de videos (50MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'daily-logs-videos',
  'daily-logs-videos',
  true,
  52428800, -- 50MB
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/3gpp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/3gpp'
  ];

-- 3. Políticas de Storage para el bucket de videos
DROP POLICY IF EXISTS "Authenticated users can upload daily log videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view daily log videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own daily log videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own daily log videos or admins can delete any" ON storage.objects;

-- INSERT: usuarios autenticados pueden subir
CREATE POLICY "Authenticated users can upload daily log videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'daily-logs-videos');

-- SELECT: lectura pública (bucket público)
CREATE POLICY "Anyone can view daily log videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'daily-logs-videos');

-- UPDATE: solo el dueño (primera carpeta = user id)
CREATE POLICY "Users can update their own daily log videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'daily-logs-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'daily-logs-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE: dueño o admin
CREATE POLICY "Users can delete their own daily log videos or admins can delete any"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daily-logs-videos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  )
);

NOTIFY pgrst, 'reload schema';
