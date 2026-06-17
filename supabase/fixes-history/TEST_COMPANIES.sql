-- Test de acceso a companies
SELECT COUNT(*) as total_companies FROM companies;

-- Ver políticas de companies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'companies';
