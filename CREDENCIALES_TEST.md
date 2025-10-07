# 🔐 Credenciales de Testing - Talento Inmobiliario 2025

**Fecha**: 6 de Octubre, 2025  
**Ambiente**: Producción/Desarrollo

---

## 🌐 URLs

### **Producción** (Vercel)
- **URL**: https://talento2025.vercel.app
- **Estado**: ⏳ Deploy en proceso

### **Desarrollo Local**
- **URL**: http://localhost:3000
- **Comando**: `npm run dev`

---

## 🔑 Supabase Configuration

### **Supabase URL**
```
https://egizwroxfxghgqmtucgk.supabase.co
```

### **Supabase Anon Key** (Cliente)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaXp3cm94ZnhnaGdxbXR1Y2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNzAxNTQsImV4cCI6MjA3Mjk0NjE1NH0.43QjvIRoC1jjwfKyDt6L_kbrsySiOA-abjj0tF6TPjo
```

### **Supabase Service Role Key** (Admin - ⚠️ NO EXPONER)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaXp3cm94ZnhnaGdxbXR1Y2drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM3MDE1NCwiZXhwIjoyMDcyOTQ2MTU0fQ.P5Bdarp5YqlLVS106Xpk5xexkRzJwtEwjaKrnhWSO1I
```

---

## 👤 Usuarios de Prueba

### **Super Admin** (Si existe)
- **Email**: admin@talentoinmobiliario.com
- **Password**: (Configurar en Supabase Auth)
- **Rol**: super_admin

### **Usuario de Desarrollo**
- **Email**: dev@talentoinmobiliario.com
- **Password**: (Configurar en Supabase Auth)
- **Rol**: admin

### **Crear Usuario de Prueba**
1. Ir a Supabase → Authentication → Users
2. Crear nuevo usuario con email y password
3. Ejecutar en SQL Editor:
```sql
-- Promover a super_admin
SELECT public.promote_to_super_admin('tu-email@ejemplo.com');
```

---

## 🧪 Flujo de Testing

### **1. Verificar Roles y Permisos**
```
URL: /admin/users/roles
Acción: Verificar que los 6 roles estén configurados
Verificar: Permisos por módulo y acción
```

### **2. Crear Usuario**
```
URL: /admin/users/new
Acción: Crear usuario de prueba
Datos: Nombre, email, rol
Verificar: Usuario aparece en lista
```

### **3. Crear Empresa Cliente**
```
URL: /admin/companies/new
Acción: Crear empresa de prueba
Datos: Nombre, NIT, tipo, logo
Verificar: Empresa aparece en lista
```

### **4. Crear Proyecto**
```
URL: /projects/new
Acción: Crear proyecto de prueba
Datos: Código, nombre, empresa, tipo de intervención
Verificar: Proyecto aparece en lista
```

### **5. Asignar Equipo** ⭐ NUEVO
```
URL: /projects/[id]/team
Acción: Agregar miembros al equipo
Datos: Seleccionar usuario, asignar rol
Verificar: Usuario aparece en equipo
```

### **6. Configurar Proyecto** ⭐ NUEVO
```
URL: /projects/[id]/config
Acción: Configurar proyecto
Tabs: General, Fiduciaria, Documentos, Cronograma
Verificar: Configuración se guarda correctamente
```

### **7. Configuración Fiduciaria** ⭐ NUEVO
```
URL: /projects/[id]/fiduciary
Acción: Configurar cuentas SIFI
Datos: SIFI 1, SIFI 2, configuración financiera
Verificar: Solo disponible para interventoría administrativa
```

---

## 🗄️ Migraciones SQL Requeridas

Si es la primera vez que usas la BD, ejecutar en orden:

### **En Supabase SQL Editor**:
```sql
-- 1. Sistema de permisos
-- Ejecutar: supabase/migrations/001_users_and_permissions.sql

-- 2. Super admin
-- Ejecutar: supabase/migrations/002_create_super_admin.sql

-- 3. Empresas
-- Ejecutar: supabase/migrations/003_update_companies_schema.sql

-- 4. RLS de empresas
-- Ejecutar: supabase/migrations/004_fix_companies_rls.sql

-- 5. RLS de producción
-- Ejecutar: supabase/migrations/005_production_rls_policies.sql

-- 6. Mejoras en proyectos
-- Ejecutar: supabase/migrations/006_enhance_projects_schema.sql

-- 7. Sistema fiduciario ⭐
-- Ejecutar: supabase/migrations/007_fiduciary_system_working.sql

-- 8. Fix sistema fiduciario ⭐
-- Ejecutar: supabase/migrations/008_fix_fiduciary_system.sql

-- 9. Administración de estilos
-- Ejecutar: supabase/migrations/009_style_administration.sql

-- 10. Políticas de storage
-- Ejecutar: supabase/migrations/010_storage_policies.sql

-- 11. Métricas y roles de empresa
-- Ejecutar: supabase/migrations/011_performance_and_company_roles.sql

-- 12. Fix creación de usuarios
-- Ejecutar: supabase/migrations/012_fix_user_creation_rls.sql
```

---

## 🔍 Verificación de Base de Datos

### **Verificar Tablas Existen**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles',
  'companies',
  'projects',
  'project_members',
  'fiduciary_accounts',
  'financial_configurations',
  'role_permissions'
)
ORDER BY table_name;
```

### **Verificar RLS Activo**
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### **Verificar Usuario Super Admin**
```sql
SELECT id, email, role, full_name 
FROM profiles 
WHERE role = 'super_admin';
```

---

## 📋 Checklist de Testing

### **Funcionalidades Básicas**
- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Navegación funciona
- [ ] Permisos se respetan

### **Gestión de Roles** (Existente)
- [ ] Ver roles en `/admin/users/roles`
- [ ] Editar permisos de rol
- [ ] Guardar cambios

### **Gestión de Usuarios** (Existente)
- [ ] Listar usuarios en `/admin/users`
- [ ] Crear usuario en `/admin/users/new`
- [ ] Editar usuario
- [ ] Asignar permisos personalizados

### **Gestión de Empresas** (Existente)
- [ ] Listar empresas en `/admin/companies`
- [ ] Crear empresa en `/admin/companies/new`
- [ ] Editar empresa
- [ ] Upload de logo

### **Gestión de Proyectos** (Existente)
- [ ] Listar proyectos en `/projects`
- [ ] Crear proyecto en `/projects/new`
- [ ] Editar proyecto
- [ ] Filtros funcionan

### **Gestión de Equipos** ⭐ NUEVO
- [ ] Acceder a `/projects/[id]/team`
- [ ] Ver equipo actual
- [ ] Agregar miembro al equipo
- [ ] Asignar rol en proyecto
- [ ] Buscar usuarios disponibles
- [ ] Remover miembro del equipo

### **Configuración de Proyectos** ⭐ NUEVO
- [ ] Acceder a `/projects/[id]/config`
- [ ] Tab General funciona
- [ ] Tab Fiduciaria funciona (solo interventoría administrativa)
- [ ] Tab Documentos (preparado)
- [ ] Tab Cronograma (preparado)

### **Configuración Fiduciaria** ⭐ NUEVO
- [ ] Acceder a `/projects/[id]/fiduciary`
- [ ] Validación de tipo de intervención
- [ ] Formulario SIFI 1 funciona
- [ ] Formulario SIFI 2 funciona
- [ ] Configuración financiera funciona
- [ ] Guardar configuración

---

## 🐛 Problemas Conocidos

### **Si no puedes hacer login**:
1. Verificar que el usuario existe en Supabase Auth
2. Verificar que tiene perfil en tabla `profiles`
3. Ejecutar:
```sql
SELECT * FROM profiles WHERE email = 'tu-email@ejemplo.com';
```

### **Si no ves proyectos**:
1. Verificar que tienes permisos
2. Verificar que estás asignado al proyecto
3. Verificar RLS policies

### **Si configuración fiduciaria no aparece**:
1. Verificar que el proyecto tiene tipo de intervención "administrativa"
2. Editar proyecto y cambiar tipo de intervención

---

## 📞 Soporte

### **Documentación**:
- `SETUP.md` - Guía completa
- `FLUJO_CONFIGURACION.md` - Flujo jerárquico
- `docs/LOGGING_GUIDE.md` - Sistema de logging

### **Comandos Útiles**:
```bash
# Desarrollo local
npm run dev

# Ver logs
npm run dev | grep -i error

# Verificar tipos
npm run type-check

# Linter
npm run lint
```

---

## ⚠️ IMPORTANTE

- ⚠️ **NO COMPARTIR** el Service Role Key públicamente
- ⚠️ **NO COMMITEAR** este archivo con credenciales reales
- ⚠️ Usar variables de entorno en producción
- ⚠️ Rotar keys periódicamente

---

**¡Listo para testing! 🚀**

**Cualquier problema, revisar los logs del navegador (F12) y la consola de Supabase.**
