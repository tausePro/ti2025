-- =====================================================
-- MIGRACIÓN 089: CORREGIR HALLAZGOS DE SECURITY ADVISORS
-- =====================================================
-- Origen: Supabase Database Linter (lint=0007, 0010, 0013)
--
-- Hallazgos atendidos:
--   1. policy_exists_rls_disabled en public.user_company_permissions
--   2. rls_disabled_in_public        en public.user_company_permissions
--   3. security_definer_view         en public.projects_with_details
--
-- Contexto verificado antes de aplicar:
--   - public.user_company_permissions tiene 0 filas tanto en dev como en prod.
--   - El sistema de "permisos por empresa" no está cableado al frontend hoy
--     (hooks/useCompanyPermissions.ts no es invocado por ninguna pantalla).
--   - public.projects_with_details no se consulta desde código TS/JS.
--   - Las 5 políticas que dependen de user_company_permissions filtran por
--     user_id = auth.uid(), por lo que la nueva política ucp_select_own
--     mantiene su comportamiento.
--
-- Esta migración NO elimina datos. La rollback completa está en
-- supabase/fixes-history/089_rollback_security_advisors.sql.
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 1: user_company_permissions
-- =====================================================

-- 1.1 Cerrar acceso anónimo (cierre del agujero crítico).
-- Quien deba escribir en esta tabla lo hará con sesión (rol authenticated)
-- o desde el backend con service_role.
REVOKE ALL ON public.user_company_permissions FROM anon;

-- 1.2 Eliminar las 3 políticas huérfanas reportadas por el advisor.
-- Hoy no tienen efecto porque RLS está deshabilitado, pero deben removerse
-- para poder rehabilitar RLS con políticas correctas.
DROP POLICY IF EXISTS "Company admins can manage their company user permissions"
  ON public.user_company_permissions;

DROP POLICY IF EXISTS "Super admins can manage all user permissions"
  ON public.user_company_permissions;

DROP POLICY IF EXISTS "Users can view their own permissions"
  ON public.user_company_permissions;

-- 1.3 Función SECURITY DEFINER para validar "company admin"
-- sin recursión cuando una política sobre user_company_permissions
-- necesita consultar la misma tabla.
CREATE OR REPLACE FUNCTION public.user_can_manage_company_users(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_permissions
    WHERE user_id = auth.uid()
      AND company_id = p_company_id
      AND is_active = true
      AND (custom_permissions->>'can_manage_users') = 'true'
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_manage_company_users(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_manage_company_users(uuid) TO authenticated;

COMMENT ON FUNCTION public.user_can_manage_company_users(uuid) IS
  'Devuelve true si auth.uid() tiene permiso can_manage_users activo en la empresa indicada. '
  'SECURITY DEFINER para evitar recursión cuando se invoca desde políticas RLS '
  'sobre user_company_permissions.';

-- 1.4 Habilitar RLS.
ALTER TABLE public.user_company_permissions ENABLE ROW LEVEL SECURITY;

-- 1.5 Políticas no recursivas.

-- (a) El propio usuario puede ver sus filas.
CREATE POLICY "ucp_select_own"
  ON public.user_company_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- (b) admin/super_admin gestionan todo (consultando solo profiles, sin recursión).
CREATE POLICY "ucp_admin_manage_all"
  ON public.user_company_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- (c) Company admin gestiona dentro de su empresa.
-- Usa la función SECURITY DEFINER del paso 1.3 para evitar recursión.
CREATE POLICY "ucp_company_admin_manage"
  ON public.user_company_permissions
  FOR ALL
  TO authenticated
  USING (public.user_can_manage_company_users(company_id))
  WITH CHECK (public.user_can_manage_company_users(company_id));

COMMENT ON TABLE public.user_company_permissions IS
  'RLS habilitado. Las políticas no consultan user_company_permissions '
  'directamente para evitar recursión: se usa la función SECURITY DEFINER '
  'public.user_can_manage_company_users.';

-- =====================================================
-- PARTE 2: projects_with_details
-- =====================================================

-- 2.1 Forzar SECURITY INVOKER para que la vista respete las RLS de las
-- tablas subyacentes (projects, companies, project_members,
-- project_documents, project_activities) según el usuario que consulta.
ALTER VIEW public.projects_with_details SET (security_invoker = true);

COMMENT ON VIEW public.projects_with_details IS
  'Vista en modo SECURITY INVOKER: respeta las RLS de las tablas subyacentes '
  'según el usuario que consulta, no el creador de la vista.';

COMMIT;
