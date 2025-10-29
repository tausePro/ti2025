-- =====================================================
-- MIGRACIÓN 067: AUTO-ASIGNAR SANTIAGO A TODOS LOS PROYECTOS
-- =====================================================
-- Santiago (supervisor) debe estar en todos los proyectos por defecto

-- 1. Agregar Santiago a todos los proyectos existentes (solo si no existe)
INSERT INTO project_members (project_id, user_id, role_in_project, is_active)
SELECT 
  p.id,
  pr.id,
  'supervisor',
  true
FROM projects p
CROSS JOIN profiles pr
WHERE pr.email = 'talento3@talentoinmobiliario.com'
  AND NOT EXISTS (
    SELECT 1 
    FROM project_members pm 
    WHERE pm.project_id = p.id 
    AND pm.user_id = pr.id
    AND pm.role_in_project = 'supervisor'
  );

-- 2. Crear función para auto-asignar Santiago a nuevos proyectos
CREATE OR REPLACE FUNCTION auto_assign_santiago_to_project()
RETURNS TRIGGER AS $$
DECLARE
  santiago_id UUID;
BEGIN
  -- Obtener el ID de Santiago
  SELECT id INTO santiago_id
  FROM profiles
  WHERE email = 'talento3@talentoinmobiliario.com'
  LIMIT 1;

  -- Si Santiago existe, agregarlo al proyecto (solo si no existe)
  IF santiago_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = NEW.id 
      AND user_id = santiago_id 
      AND role_in_project = 'supervisor'
    ) THEN
      INSERT INTO project_members (project_id, user_id, role_in_project, is_active)
      VALUES (NEW.id, santiago_id, 'supervisor', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger que se ejecuta al crear un proyecto
DROP TRIGGER IF EXISTS trigger_auto_assign_santiago ON projects;

CREATE TRIGGER trigger_auto_assign_santiago
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_santiago_to_project();

-- 4. Verificar que Santiago está en todos los proyectos
SELECT 
  p.project_code,
  p.name,
  CASE 
    WHEN pm.id IS NOT NULL THEN 'Asignado'
    ELSE 'No asignado'
  END as estado_santiago
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id 
  AND pm.user_id = (SELECT id FROM profiles WHERE email = 'talento3@talentoinmobiliario.com')
WHERE p.is_archived = false
ORDER BY p.name;
