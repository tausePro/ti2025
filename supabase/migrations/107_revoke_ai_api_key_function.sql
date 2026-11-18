-- =====================================================
-- MIGRACIÓN 107: CERRAR get_active_ai_api_key A LOS USUARIOS
-- =====================================================
-- La función de la migración 072 es SECURITY DEFINER y, por los permisos por
-- defecto del esquema public, la podían ejecutar anon y authenticated: devolvía
-- la clave de IA a cualquiera que tuviera la clave pública de Supabase, sin
-- iniciar sesión. Ningún código de la aplicación la usa.
--
-- Queda disponible solo para service_role. La clave de IA pasa a una variable
-- de entorno del servidor (OPENAI_API_KEY).
--
-- Aditiva e idempotente: solo cambia permisos de ejecución de esta función.

REVOKE EXECUTE ON FUNCTION public.get_active_ai_api_key(varchar) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_ai_api_key(varchar) TO service_role;
