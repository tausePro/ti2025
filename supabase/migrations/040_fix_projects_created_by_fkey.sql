-- =====================================================
-- MIGRACIÓN 040: CORREGIR FOREIGN KEY DE PROJECTS.CREATED_BY
-- =====================================================
-- El constraint apunta a 'users' pero debe apuntar a 'profiles'

-- Eliminar constraint incorrecto
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_created_by_fkey;

-- Crear constraint correcto apuntando a profiles
ALTER TABLE projects
ADD CONSTRAINT projects_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Comentario
COMMENT ON CONSTRAINT projects_created_by_fkey ON projects IS 
'Usuario que creó el proyecto. Referencia a profiles.id (no users.id)';
