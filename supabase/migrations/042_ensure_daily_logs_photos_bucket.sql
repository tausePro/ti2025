-- =====================================================
-- MIGRACIÓN 042: ASEGURAR BUCKET Y POLÍTICAS DE FOTOS
-- =====================================================
-- Crear bucket y políticas para fotos de bitácoras diarias

-- 1. Crear bucket si no existe
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
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ];

-- 2. Eliminar políticas existentes si hay
DROP POLICY IF EXISTS "Authenticated users can upload daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own daily log photos or admins can delete any" ON storage.objects;

-- 3. Crear políticas

-- Política INSERT: Usuarios autenticados pueden subir
CREATE POLICY "Authenticated users can upload daily log photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'daily-logs-photos');

-- Política SELECT: Todos pueden ver (bucket público)
CREATE POLICY "Anyone can view daily log photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'daily-logs-photos');

-- Política UPDATE: Solo el dueño puede actualizar
CREATE POLICY "Users can update their own daily log photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'daily-logs-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'daily-logs-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política DELETE: Dueño o admin pueden eliminar
CREATE POLICY "Users can delete their own daily log photos or admins can delete any"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daily-logs-photos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  )
);

-- 4. Verificar que la columna photos existe en daily_logs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_logs' 
    AND column_name = 'photos'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN photos TEXT[];
    COMMENT ON COLUMN daily_logs.photos IS 'URLs de fotos subidas a Supabase Storage';
  END IF;
END $$;

-- Comentarios
COMMENT ON TABLE storage.buckets IS 'Buckets de almacenamiento de Supabase Storage';
