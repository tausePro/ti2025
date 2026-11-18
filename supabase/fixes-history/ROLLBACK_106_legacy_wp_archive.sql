-- Rollback de la migración 106 (archivo histórico de WordPress).
-- Deshace en orden lo que creó el importador y luego elimina las tablas.
-- Solo toca registros marcados en legacy_wp_id_map; los datos que existían
-- antes de la importación no se modifican.
--
-- Antes de ejecutarlo: vaciar los buckets legacy-wp-media y
-- legacy-wp-documents desde el panel de Storage o la API (Supabase no
-- permite borrar objetos de Storage con SQL).

BEGIN;

-- 1. Campos de perfil completados por el importador (solo si siguen igual)
UPDATE profiles p SET signature_url = NULL
FROM legacy_wp_id_map m
WHERE m.entity = 'usuario' AND m.target_id = p.id
  AND m.details->'filled' ? 'signature_url'
  AND p.signature_url = m.details->'filled'->>'signature_url';

UPDATE profiles p SET avatar_url = NULL
FROM legacy_wp_id_map m
WHERE m.entity = 'usuario' AND m.target_id = p.id
  AND m.details->'filled' ? 'avatar_url'
  AND p.avatar_url = m.details->'filled'->>'avatar_url';

UPDATE profiles p SET professional_license = NULL
FROM legacy_wp_id_map m
WHERE m.entity = 'usuario' AND m.target_id = p.id
  AND m.details->'filled' ? 'professional_license'
  AND p.professional_license = m.details->'filled'->>'professional_license';

UPDATE profiles p SET phone = NULL
FROM legacy_wp_id_map m
WHERE m.entity = 'usuario' AND m.target_id = p.id
  AND m.details->'filled' ? 'phone'
  AND p.phone = m.details->'filled'->>'phone';

-- 2. Documentos legales importados
DELETE FROM project_documents d
USING legacy_wp_id_map m
WHERE m.entity = 'documento' AND m.created_by_import AND m.target_id = d.id;

-- 3. Informes históricos
DROP TABLE IF EXISTS legacy_wp_reports;

-- 4. Proyectos finalizados creados por el importador, solo si no tienen
--    actividad registrada en la plataforma nueva
DELETE FROM projects pr
USING legacy_wp_id_map m
WHERE m.entity = 'proyecto' AND m.created_by_import AND m.target_id = pr.id
  AND NOT EXISTS (SELECT 1 FROM daily_logs d WHERE d.project_id = pr.id)
  AND NOT EXISTS (SELECT 1 FROM biweekly_reports b WHERE b.project_id = pr.id);

-- 5. Empresas creadas por el importador que no quedaron asociadas a proyectos.
--    Primero las métricas de uso que el trigger de la migración 011 registró
--    al crearlas, porque performance_metrics las referencia sin ON DELETE.
DELETE FROM performance_metrics pm
USING legacy_wp_id_map m, companies c
WHERE m.entity = 'empresa' AND m.created_by_import AND m.target_id = c.id
  AND pm.company_id = c.id
  AND NOT EXISTS (
    SELECT 1 FROM projects pr
    WHERE pr.client_company_id = c.id OR pr.contractor_company_id = c.id
  );

DELETE FROM companies c
USING legacy_wp_id_map m
WHERE m.entity = 'empresa' AND m.created_by_import AND m.target_id = c.id
  AND NOT EXISTS (
    SELECT 1 FROM projects pr
    WHERE pr.client_company_id = c.id OR pr.contractor_company_id = c.id
  );

-- 6. Mapa de correspondencias y políticas de Storage
DROP TABLE IF EXISTS legacy_wp_id_map;
DROP POLICY IF EXISTS "Legacy WP documents readable by project members" ON storage.objects;

COMMIT;

-- 7. Con los buckets ya vacíos:
-- DELETE FROM storage.buckets WHERE id IN ('legacy-wp-media', 'legacy-wp-documents');

NOTIFY pgrst, 'reload schema';
