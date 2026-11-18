-- =====================================================
-- ROLLBACK MIGRACIÓN 107
-- =====================================================
-- ATENCIÓN: devuelve la función get_active_ai_api_key a anon y authenticated,
-- es decir, vuelve a exponer la clave de IA a cualquiera con la clave pública
-- de Supabase. Ejecutar solo si algo indispensable depende de ella.

GRANT EXECUTE ON FUNCTION public.get_active_ai_api_key(varchar) TO anon, authenticated;
