-- Ver todas las columnas de daily_logs
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_logs'
AND table_schema = 'public'
ORDER BY ordinal_position;
