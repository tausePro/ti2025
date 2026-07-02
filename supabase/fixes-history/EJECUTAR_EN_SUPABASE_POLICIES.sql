-- =====================================================
-- POLÍTICAS RLS PARA BUCKET daily-logs-photos
-- =====================================================
-- Ejecutar este SQL en el SQL Editor de Supabase Dashboard

-- 1. Eliminar políticas existentes (si hay)
DROP POLICY IF EXISTS "Authenticated users can upload daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own daily log photos or admins can delete any" ON storage.objects;

-- 2. Crear políticas nuevas

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

-- 3. Verificar políticas creadas
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%daily log photos%'
ORDER BY policyname;
