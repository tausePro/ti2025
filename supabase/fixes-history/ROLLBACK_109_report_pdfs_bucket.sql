-- =====================================================
-- ROLLBACK MIGRACIÓN 109
-- =====================================================
-- Los PDF guardados se pueden volver a generar. Antes de ejecutarlo, vaciar el
-- bucket report-pdfs desde el panel de Storage o la API (Supabase no permite
-- borrar objetos de Storage con SQL).

DELETE FROM storage.buckets WHERE id = 'report-pdfs';
