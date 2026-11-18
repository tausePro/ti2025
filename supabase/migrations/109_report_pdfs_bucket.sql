-- =====================================================
-- MIGRACIÓN 109: BUCKET PRIVADO PARA LOS PDF DE INFORMES
-- =====================================================
-- Los PDF de informes se generan en el servidor con Chromium para que salgan
-- iguales para todos. Vercel no puede responder archivos de más de 4,5 MB, así
-- que el PDF se guarda aquí y se entrega con una URL firmada de corta duración.
-- Ruta: legacy/{id del informe histórico}/v{versión de plantilla}-{fecha}.pdf
--
-- Sin políticas para usuarios: solo el servidor (service_role) lee y escribe,
-- después de verificar con la sesión del usuario que puede ver el informe.
-- Aditiva e idempotente.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('report-pdfs', 'report-pdfs', false, 104857600, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
