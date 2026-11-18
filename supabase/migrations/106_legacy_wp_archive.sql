-- =====================================================
-- MIGRACIÓN 106: Archivo histórico de la plataforma anterior (WordPress)
-- =====================================================
-- Contexto: los informes de supervisión (mensuales y quincenales) se
-- elaboraron desde 2020 en app.talentoinmobiliario.com (WordPress + Toolset)
-- y se seguirán elaborando allí hasta el cierre de noviembre de 2026. Esta
-- migración crea el espacio para conservarlos íntegros y de solo lectura en
-- la plataforma nueva, junto con el mapa de correspondencias que hace
-- idempotente al importador (scripts/wp-legacy/migrate.mjs).
--
-- Cambio aditivo y no destructivo:
-- - legacy_wp_reports: informes históricos tal cual (HTML por sección en el
--   orden de impresión de WordPress, galería, firmas y autor), enlazados a
--   projects. Solo lectura para usuarios; escribe únicamente el importador
--   con service_role. Los leen administración y los miembros activos del
--   proyecto, excepto el rol cliente (en WordPress no tenía acceso).
-- - Un proyecto con informes históricos no se puede eliminar (ON DELETE
--   RESTRICT): debe archivarse. Así el archivo no se pierde al eliminar un
--   proyecto desde la interfaz.
-- - legacy_wp_id_map: correspondencia ID de WordPress -> registro en
--   Supabase (proyectos, empresas, documentos, perfiles). Permite repetir la
--   importación sin duplicar y saber qué registros creó el importador.
-- - Bucket público legacy-wp-media (igual que daily-logs-photos) para las
--   imágenes de los informes, y bucket privado legacy-wp-documents para los
--   documentos legales de los proyectos.
-- - No se modifica ni elimina ninguna tabla ni política existente.
--
-- Rollback: supabase/fixes-history/ROLLBACK_106_legacy_wp_archive.sql

-- -----------------------------------------------------
-- 1. Informes históricos
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS legacy_wp_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_post_id BIGINT NOT NULL UNIQUE,
  wp_project_id BIGINT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  report_kind TEXT NOT NULL CHECK (report_kind IN ('mensual', 'quincenal', 'otro')),
  report_number INTEGER,
  title TEXT NOT NULL,
  short_title TEXT,
  long_title TEXT,
  period_start DATE,
  period_end DATE,
  period_source TEXT CHECK (period_source IN ('rango_del_titulo', 'mes_del_titulo', 'mes_del_titulo_y_fecha')),
  notified_on DATE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  photos_title TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  signatures JSONB NOT NULL DEFAULT '{}'::jsonb,
  director_de_obra TEXT,
  director_de_obra_matricula TEXT,
  author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_wp_user_id BIGINT,
  author_name TEXT,
  wp_created_at TIMESTAMPTZ NOT NULL,
  wp_modified_at TIMESTAMPTZ NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT legacy_wp_reports_period_check
    CHECK (period_start IS NULL OR period_end IS NULL OR period_start <= period_end)
);

COMMENT ON TABLE legacy_wp_reports IS
  'Informes de supervisión importados de la plataforma anterior (WordPress). Solo lectura.';
COMMENT ON COLUMN legacy_wp_reports.sections IS
  'Secciones en orden de impresión: [{key, title, html}]. El HTML se conserva tal cual, con las URLs de imágenes apuntando a legacy-wp-media.';
COMMENT ON COLUMN legacy_wp_reports.photos IS
  'Galería del registro fotográfico en su orden original: [{url, sort_order}]';
COMMENT ON COLUMN legacy_wp_reports.signatures IS
  'Casillas de firma marcadas en WordPress: {directora_general, coordinador_de_proyectos, residente, director_interventoria}';
COMMENT ON COLUMN legacy_wp_reports.period_source IS
  'Cómo se dedujo el período: rango explícito en el título, mes completo del título, o mes del título con el año de la fecha de notificación (o de última edición). NULL si el título no lo permite.';

CREATE INDEX IF NOT EXISTS idx_legacy_wp_reports_project
  ON legacy_wp_reports(project_id, wp_created_at DESC);

ALTER TABLE legacy_wp_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legacy_wp_reports_select" ON legacy_wp_reports;
CREATE POLICY "legacy_wp_reports_select" ON legacy_wp_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'gerente')
    )
    OR EXISTS (
      SELECT 1
      FROM project_members pm
      JOIN profiles p ON p.id = pm.user_id
      WHERE pm.project_id = legacy_wp_reports.project_id
        AND pm.user_id = auth.uid()
        AND pm.is_active = TRUE
        AND p.role <> 'cliente'
        AND pm.role_in_project <> 'cliente'
    )
  );

COMMENT ON POLICY "legacy_wp_reports_select" ON legacy_wp_reports IS
  'Migración 106: administración y miembros activos del proyecto (excepto clientes) leen los informes históricos. Sin políticas de escritura: solo service_role.';

-- -----------------------------------------------------
-- 2. Mapa de correspondencias WordPress -> Supabase
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS legacy_wp_id_map (
  entity TEXT NOT NULL CHECK (entity IN ('proyecto', 'empresa', 'documento', 'usuario')),
  wp_id BIGINT NOT NULL,
  target_id UUID NOT NULL,
  created_by_import BOOLEAN NOT NULL DEFAULT FALSE,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity, wp_id)
);

COMMENT ON TABLE legacy_wp_id_map IS
  'Correspondencia entre IDs de WordPress y registros de Supabase usada por el importador histórico.';
COMMENT ON COLUMN legacy_wp_id_map.created_by_import IS
  'TRUE si el registro destino fue creado por el importador (por ejemplo, proyectos finalizados archivados).';
COMMENT ON COLUMN legacy_wp_id_map.details IS
  'Datos de auditoría; para perfiles, los campos que el importador completó.';

CREATE INDEX IF NOT EXISTS idx_legacy_wp_id_map_target ON legacy_wp_id_map(target_id);

ALTER TABLE legacy_wp_id_map ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- 3. Storage
-- -----------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('legacy-wp-media', 'legacy-wp-media', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 100 MB: hay PDFs de estudios y licencias de hasta 60 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('legacy-wp-documents', 'legacy-wp-documents', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- legacy-wp-media es público: las URLs públicas no requieren política de
-- lectura y no se crean políticas de escritura (solo service_role sube).

-- legacy-wp-documents es privado: ruta {project_id}/{id de project_documents}{extensión}.
DROP POLICY IF EXISTS "Legacy WP documents readable by project members" ON storage.objects;
CREATE POLICY "Legacy WP documents readable by project members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'legacy-wp-documents'
  AND (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'gerente')
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.is_active = TRUE
        AND pm.project_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

NOTIFY pgrst, 'reload schema';
