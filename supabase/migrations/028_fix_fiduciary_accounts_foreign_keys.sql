-- =====================================================
-- MIGRACIÓN 028: FIX FOREIGN KEYS EN FIDUCIARY_ACCOUNTS
-- =====================================================
-- PROBLEMA: created_by apunta a 'users' en lugar de 'profiles'
-- SOLUCIÓN: Cambiar foreign key a profiles(id)

-- 1. Eliminar foreign key incorrecta
ALTER TABLE fiduciary_accounts
DROP CONSTRAINT IF EXISTS fiduciary_accounts_created_by_fkey;

-- 2. Crear foreign key correcta apuntando a profiles
ALTER TABLE fiduciary_accounts
ADD CONSTRAINT fiduciary_accounts_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- 3. Hacer que created_by sea nullable (por si acaso)
ALTER TABLE fiduciary_accounts
ALTER COLUMN created_by DROP NOT NULL;

COMMENT ON CONSTRAINT fiduciary_accounts_created_by_fkey ON fiduciary_accounts IS 
'Referencia al perfil del usuario que creó la cuenta fiduciaria';
