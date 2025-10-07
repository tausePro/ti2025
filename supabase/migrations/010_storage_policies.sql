-- Configurar políticas RLS para el bucket de branding assets
-- Esto permite que los usuarios autenticados suban archivos y todos puedan leerlos

-- Habilitar RLS en storage.objects si no está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública de archivos en branding-assets
CREATE POLICY "Public read access for branding assets" ON storage.objects
FOR SELECT USING (bucket_id = 'branding-assets');

-- Política para permitir subida a usuarios autenticados
CREATE POLICY "Authenticated users can upload branding assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'branding-assets' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir actualización a usuarios autenticados
CREATE POLICY "Authenticated users can update branding assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'branding-assets' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir eliminación a usuarios autenticados
CREATE POLICY "Authenticated users can delete branding assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'branding-assets' 
  AND auth.role() = 'authenticated'
);

-- También necesitamos permitir que los usuarios vean los buckets
-- Esto se hace a nivel de storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública de buckets
CREATE POLICY "Public read access for buckets" ON storage.buckets
FOR SELECT USING (true);

-- Política para permitir que usuarios autenticados vean buckets
CREATE POLICY "Authenticated users can view buckets" ON storage.buckets
FOR SELECT USING (auth.role() = 'authenticated');
