-- =====================================================
-- ROLLBACK DE LA MIGRACIÓN 089
-- =====================================================
-- Pega este script tal cual en el SQL Editor de Supabase si necesitas
-- revertir la migración 089_fix_security_advisors.sql.
--
-- Deja la base en el mismo estado funcional que tenía antes:
--   - user_company_permissions sin RLS, con privilegios completos para anon
--     y las 3 políticas huérfanas restauradas.
--   - projects_with_details sin la opción security_invoker.
--
-- Nota: las 3 políticas se recrean exactamente como estaban en producción
-- (definiciones obtenidas con la inspección previa).
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 2: revertir projects_with_details
-- =====================================================

ALTER VIEW public.projects_with_details RESET (security_invoker);

-- =====================================================
-- PARTE 1: revertir user_company_permissions
-- =====================================================

-- 1.5 Eliminar políticas creadas por la migración 089
DROP POLICY IF EXISTS "ucp_select_own"             ON public.user_company_permissions;
DROP POLICY IF EXISTS "ucp_admin_manage_all"       ON public.user_company_permissions;
DROP POLICY IF EXISTS "ucp_company_admin_manage"   ON public.user_company_permissions;

-- 1.4 Volver a deshabilitar RLS
ALTER TABLE public.user_company_permissions DISABLE ROW LEVEL SECURITY;

-- 1.3 Eliminar la función SECURITY DEFINER auxiliar
DROP FUNCTION IF EXISTS public.user_can_manage_company_users(uuid);

-- 1.2 Restaurar las 3 políticas huérfanas tal cual estaban
CREATE POLICY "Company admins can manage their company user permissions"
  ON public.user_company_permissions
  FOR ALL
  USING (
    company_id IN (
      SELECT ucp.company_id
      FROM public.user_company_permissions ucp
      WHERE ucp.user_id = auth.uid()
        AND ucp.is_active = true
        AND (ucp.custom_permissions->>'can_manage_users') = 'true'
    )
  );

CREATE POLICY "Super admins can manage all user permissions"
  ON public.user_company_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Users can view their own permissions"
  ON public.user_company_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- 1.1 Restaurar privilegios para anon
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.user_company_permissions TO anon;

COMMIT;
