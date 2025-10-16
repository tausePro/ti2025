# Plan de Migración: Tipos de Intervención

## 🎯 Objetivo
Actualizar todos los archivos que usan `intervention_types` de forma ordenada y completa.

## 📋 Tipos Antiguos vs Nuevos

### Antiguos (Legacy):
- `supervision_tecnica`
- `interventoria_administrativa`

### Nuevos:
- `sti_continua` - Supervisión Técnica Independiente (STI) Continua
- `sti_itinerante` - Supervisión Técnica Independiente (STI) Itinerante
- `interventoria_desembolsos` - Interventoría de Desembolsos (antes Administrativa)
- `interventoria` - Interventoría
- `interventoria_itinerante` - Interventoría Itinerante
- `otro` - Otro (con campo personalizado `intervention_types_other`)

## 📁 Archivos a Actualizar (12 archivos)

### ✅ Ya Actualizados:
1. `/types/index.ts` - InterventionType enum
2. `/components/projects/ProjectFormWithFinancial.tsx` - Formulario principal
3. `/app/(dashboard)/projects/new/page.tsx` - Página de creación
4. `/app/(dashboard)/projects/[id]/page.tsx` - Vista de proyecto

### ⏳ Pendientes de Actualizar:
5. `/components/projects/ProjectForm.tsx` - Schema y validación
6. `/components/projects/ProjectCard.tsx` - Visualización en tarjetas
7. `/components/projects/ProjectOverview.tsx` - Vista general
8. `/app/(dashboard)/projects/[id]/edit/page.tsx` - Edición
9. `/components/projects/ProjectFilters.tsx` - Filtros
10. `/types/database.ts` - Tipos de BD
11. `/types/database.types.ts` - Tipos generados
12. `/hooks/useProjects.ts` - Hook de proyectos

## 🔧 Cambios Necesarios en Cada Archivo

### 1. Schemas de Validación (Zod)
```typescript
// ANTES:
z.array(z.enum(['supervision_tecnica', 'interventoria_administrativa']))

// DESPUÉS:
z.array(z.enum([
  'sti_continua',
  'sti_itinerante', 
  'interventoria_desembolsos',
  'interventoria',
  'interventoria_itinerante',
  'otro',
  'supervision_tecnica', // legacy
  'interventoria_administrativa' // legacy
]))
```

### 2. Funciones de Mapeo de Labels
```typescript
// Agregar casos para todos los nuevos tipos
case 'sti_continua': return 'STI Continua'
case 'sti_itinerante': return 'STI Itinerante'
case 'interventoria_desembolsos': return 'Interventoría de Desembolsos'
case 'interventoria': return 'Interventoría'
case 'interventoria_itinerante': return 'Interventoría Itinerante'
case 'otro': return project.intervention_types_other || 'Otro'
```

### 3. Validaciones de Presupuesto
```typescript
// ANTES:
if (data.intervention_types.includes('interventoria_administrativa'))

// DESPUÉS:
if (data.intervention_types.includes('interventoria_desembolsos'))
```

### 4. Checkboxes en Formularios
Reemplazar los 2 checkboxes antiguos por 6 nuevos + campo "Otro"

## 🗄️ Base de Datos

### Campos en `projects`:
- `intervention_types`: TEXT[] (array, sin constraints)
- `intervention_types_other`: TEXT (nuevo, opcional)

### Migración 037:
Ya ejecutada, agrega `intervention_types_other`

## ⚠️ Compatibilidad
- Mantener tipos legacy para proyectos existentes
- Nuevos proyectos usan solo tipos nuevos
- No hay migración de datos necesaria

## 📝 Orden de Ejecución
1. Actualizar tipos base (`types/index.ts`) ✅
2. Actualizar formularios de creación ✅
3. Actualizar vistas de proyecto ✅
4. Actualizar formularios de edición ⏳
5. Actualizar componentes de visualización ⏳
6. Actualizar filtros y búsquedas ⏳
7. Probar flujo completo
8. Deploy

## 🧪 Testing
- [ ] Crear proyecto con tipos nuevos
- [ ] Editar proyecto existente
- [ ] Ver proyecto con tipos antiguos
- [ ] Ver proyecto con tipos nuevos
- [ ] Filtrar por tipo de intervención
- [ ] Tab financiero aparece con `interventoria_desembolsos`
