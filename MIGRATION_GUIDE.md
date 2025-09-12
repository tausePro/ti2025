# 🚀 Guía de Migración - Sistema de Permisos Granulares

## 📋 Resumen
Se ha implementado un sistema de permisos granulares basado en la propuesta de Opus, reemplazando el sistema básico de roles por uno más flexible y seguro.

## 🔧 Cambios Implementados

### 1. **Nueva Estructura de Base de Datos**
- ✅ `profiles` (reemplaza `users`)
- ✅ `role_permissions` (permisos por rol)
- ✅ `user_custom_permissions` (permisos personalizados)
- ✅ `project_members` (reemplaza `project_teams`)
- ✅ RLS policies completas
- ✅ Funciones helper: `check_user_permission()` y `get_user_permissions()`

### 2. **Tipos TypeScript Actualizados**
- ✅ Nuevas interfaces en `types/database.ts`
- ✅ Tipos para permisos granulares
- ✅ Enums para módulos y acciones

### 3. **Hook de Permisos Renovado**
- ✅ `usePermissions()` con integración RPC
- ✅ `useProjectPermissions()` para permisos específicos por proyecto

### 4. **Layout Dashboard Actualizado**
- ✅ Navegación basada en permisos
- ✅ Carga de perfil desde tabla `profiles`
- ✅ Menú administrativo dinámico

## 🚨 PASOS OBLIGATORIOS PARA ACTIVAR

### Paso 1: Ejecutar Migraciones SQL
```sql
-- 1. En Supabase SQL Editor, ejecutar:
-- Contenido de: supabase/migrations/001_users_and_permissions.sql

-- 2. Luego ejecutar:
-- Contenido de: supabase/migrations/002_create_super_admin.sql
```

### Paso 2: Crear Usuario Super Admin
```sql
-- 1. Registrarte en la aplicación con tu email
-- 2. Ejecutar en Supabase SQL Editor:
SELECT public.promote_to_super_admin('tu-email@ejemplo.com');
```

### Paso 3: Instalar Dependencias Faltantes
```bash
npm install @supabase/auth-helpers-nextjs
```

## 📊 Estructura de Permisos

### Módulos Disponibles:
- `projects` - Gestión de proyectos
- `reports` - Informes y reportes
- `financial` - Módulo financiero
- `users` - Gestión de usuarios
- `companies` - Gestión de empresas
- `bitacora` - Bitácoras diarias

### Acciones Disponibles:
- `create` - Crear registros
- `read` - Leer/ver registros
- `update` - Actualizar registros
- `delete` - Eliminar registros
- `approve` - Aprobar documentos
- `sign` - Firmar documentos
- `assign` - Asignar usuarios/equipos

### Jerarquía de Roles:
1. **super_admin** - Todos los permisos
2. **admin** - Gestión completa excepto eliminaciones críticas
3. **gerente** - Supervisión y aprobaciones
4. **supervisor** - Operaciones de campo y aprobaciones
5. **residente** - Registro de bitácoras y reportes
6. **cliente** - Solo visualización de sus proyectos

## 🔐 Uso del Sistema de Permisos

### En Componentes:
```typescript
import { usePermissions } from '@/hooks/usePermissions'

function MyComponent() {
  const { hasPermission } = usePermissions()
  
  const canCreateProject = hasPermission('projects', 'create')
  const canApproveReport = hasPermission('reports', 'approve')
  
  return (
    <div>
      {canCreateProject && <CreateProjectButton />}
      {canApproveReport && <ApproveButton />}
    </div>
  )
}
```

### Para Permisos Específicos de Proyecto:
```typescript
import { useProjectPermissions } from '@/hooks/usePermissions'

function ProjectComponent({ projectId }: { projectId: string }) {
  const { hasProjectPermission } = useProjectPermissions(projectId)
  
  const canEditBitacora = hasProjectPermission('bitacora', 'update')
  
  return (
    <div>
      {canEditBitacora && <EditBitacoraButton />}
    </div>
  )
}
```

## 🛠️ Gestión de Permisos Personalizados

### Otorgar Permiso Específico:
```sql
INSERT INTO public.user_custom_permissions (
  user_id, 
  module, 
  action, 
  allowed, 
  project_id,
  granted_by
) VALUES (
  'user-uuid',
  'reports',
  'approve',
  true,
  'project-uuid', -- opcional, para permisos específicos de proyecto
  'admin-uuid'
);
```

### Revocar Permiso:
```sql
UPDATE public.user_custom_permissions 
SET allowed = false 
WHERE user_id = 'user-uuid' 
AND module = 'reports' 
AND action = 'approve';
```

## 🔍 Verificación del Sistema

### 1. Comprobar Permisos de Usuario:
```sql
SELECT * FROM get_user_permissions('user-uuid');
```

### 2. Verificar Permiso Específico:
```sql
SELECT check_user_permission(
  'user-uuid',
  'projects',
  'create',
  'project-uuid' -- opcional
);
```

### 3. Ver Miembros de Proyecto:
```sql
SELECT pm.*, p.full_name, p.role 
FROM project_members pm
JOIN profiles p ON pm.user_id = p.id
WHERE pm.project_id = 'project-uuid'
AND pm.is_active = true;
```

## ⚠️ Problemas Conocidos y Soluciones

### Error: Cannot find module '@supabase/auth-helpers-nextjs'
```bash
npm install @supabase/auth-helpers-nextjs
```

### Error: RLS policy denies access
- Verificar que el usuario tenga perfil en tabla `profiles`
- Comprobar que esté asignado al proyecto en `project_members`
- Revisar permisos en `role_permissions` y `user_custom_permissions`

### Usuario no puede acceder después de migración
```sql
-- Verificar si existe el perfil
SELECT * FROM profiles WHERE email = 'usuario@ejemplo.com';

-- Si no existe, crearlo manualmente
INSERT INTO profiles (id, email, full_name, role)
VALUES ('auth-user-uuid', 'usuario@ejemplo.com', 'Nombre Usuario', 'residente');
```

## 🎯 Próximos Pasos Recomendados

1. **Ejecutar migraciones** en Supabase
2. **Crear usuario super_admin** inicial
3. **Probar sistema de permisos** con diferentes roles
4. **Migrar datos existentes** si los hay
5. **Actualizar componentes restantes** para usar nueva estructura
6. **Implementar gestión de permisos** en interfaz administrativa

## 📞 Soporte

Si encuentras problemas durante la migración:
1. Revisar logs de Supabase SQL Editor
2. Verificar que todas las migraciones se ejecutaron correctamente
3. Comprobar que el usuario tenga perfil y permisos asignados
4. Revisar políticas RLS están habilitadas

---

**¡Sistema de Permisos Granulares listo para producción!** 🚀
