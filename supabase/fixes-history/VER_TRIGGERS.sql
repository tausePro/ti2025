-- Ver todos los triggers en la tabla profiles
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;

-- Ver funciones que podrían modificar profiles
SELECT
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE prosrc ILIKE '%profiles%'
AND prosrc ILIKE '%role%'
AND prosrc ILIKE '%admin%';
