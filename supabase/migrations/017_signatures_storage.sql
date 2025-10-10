-- =====================================================
-- MIGRACIÓN 017: STORAGE PARA FIRMAS
-- =====================================================

-- Crear bucket para firmas si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para firmas
-- Permitir que usuarios autenticados suban sus propias firmas
CREATE POLICY "Users can upload their own signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que usuarios autenticados actualicen sus propias firmas
CREATE POLICY "Users can update their own signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que usuarios autenticados eliminen sus propias firmas
CREATE POLICY "Users can delete their own signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que todos vean las firmas (son públicas para los informes)
CREATE POLICY "Anyone can view signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signatures');
