-- Configurar políticas RLS para el bucket branding-assets
-- Este script debe ejecutarse en el SQL Editor de Supabase

-- 1. Permitir lectura pública de archivos en branding-assets
CREATE POLICY "Allow public read access to branding assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'branding-assets');

-- 2. Permitir a usuarios autenticados subir archivos
CREATE POLICY "Allow authenticated users to upload branding assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'branding-assets' 
  AND auth.role() = 'authenticated'
);

-- 3. Permitir a usuarios autenticados actualizar archivos
CREATE POLICY "Allow authenticated users to update branding assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'branding-assets' 
  AND auth.role() = 'authenticated'
);

-- 4. Permitir a usuarios autenticados eliminar archivos
CREATE POLICY "Allow authenticated users to delete branding assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'branding-assets' 
  AND auth.role() = 'authenticated'
);

-- 5. Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%branding%';

