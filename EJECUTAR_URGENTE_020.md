# 🚨 MIGRACIÓN CRÍTICA - EJECUTAR INMEDIATAMENTE

## Problema Identificado

1. **Proyectos no cargan** - Se quedan en loading infinito
2. **Cambio de rol inesperado** - El perfil cambia a "admin" y pierde permisos
3. **Logout no funciona** - No cierra sesión correctamente

## Causa Raíz

Múltiples políticas RLS (Row Level Security) conflictivas en las tablas `projects` y `companies` que bloquean las consultas.

## Solución

Ejecutar la migración `020_fix_rls_projects_critical.sql` que:
- Elimina todas las políticas duplicadas/conflictivas
- Crea un set limpio y funcional de políticas RLS
- Corrige el acceso a proyectos y empresas

## Pasos para Ejecutar

### 1. Ir a Supabase Dashboard
https://supabase.com/dashboard/project/YOUR_PROJECT_ID

### 2. Abrir SQL Editor
- En el menú lateral, clic en "SQL Editor"
- Clic en "New query"

### 3. Copiar y Pegar el Contenido
Copiar TODO el contenido del archivo:
```
supabase/migrations/020_fix_rls_projects_critical.sql
```

### 4. Ejecutar
- Clic en "Run" o presionar `Ctrl/Cmd + Enter`
- Esperar confirmación: "Success. No rows returned"

### 5. Verificar
Después de ejecutar, verificar que:
- ✅ Los proyectos cargan correctamente
- ✅ El perfil de Yuliana mantiene su rol
- ✅ El logout funciona correctamente

## Políticas Creadas

### Para PROJECTS:
- **admin_full_access**: Admin y super_admin acceso total
- **gerente_manage_projects**: Gerente gestiona todos los proyectos
- **supervisor_view_all_projects**: Supervisor ve todos los proyectos
- **supervisor_manage_own_projects**: Supervisor crea proyectos
- **supervisor_update_assigned_projects**: Supervisor edita asignados
- **residente_view_assigned**: Residente solo ve asignados
- **cliente_view_company**: Cliente ve proyectos de su empresa

### Para COMPANIES:
- **management_view_companies**: Admin, gerente y supervisor ven empresas activas
- **cliente_view_own_company**: Cliente solo ve su propia empresa
- **admin_manage_companies**: Admin gestiona empresas
- **Residentes**: NO ven empresas (solo ven proyectos asignados)

## ⚠️ IMPORTANTE

Esta migración es **CRÍTICA** y debe ejecutarse **ANTES** de continuar con cualquier otro desarrollo o prueba en producción.

## Contacto

Si hay algún error al ejecutar, contactar inmediatamente.
