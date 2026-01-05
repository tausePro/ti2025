-- Migración para actualizar los tipos de empresa
-- Eliminar: interventora, supervisora
-- Agregar: gerencia, otra

-- Primero, actualizar las empresas existentes que tengan tipos obsoletos
UPDATE companies 
SET company_type = 'otra' 
WHERE company_type IN ('interventora', 'supervisora');

-- Nota: Si company_type es un enum en la base de datos, necesitarás:
-- 1. Crear un nuevo enum con los valores correctos
-- 2. Actualizar la columna para usar el nuevo enum
-- 3. Eliminar el enum antiguo

-- Si company_type es TEXT (más flexible), los cambios anteriores son suficientes
-- y la validación se hace a nivel de aplicación (Zod schema)
