# 🚀 Guía de Configuración - Talento Inmobiliario 2025

## 📋 Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Instalación Local](#instalación-local)
3. [Configuración de Supabase](#configuración-de-supabase)
4. [Despliegue a Producción](#despliegue-a-producción)
5. [Verificación del Sistema](#verificación-del-sistema)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Requisitos Previos

- **Node.js**: v18 o superior
- **npm**: v9 o superior
- **Cuenta de Supabase**: [supabase.com](https://supabase.com)
- **Cuenta de Vercel** (opcional): [vercel.com](https://vercel.com)

---

## 💻 Instalación Local

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tausePro/ti2025.git
cd ti2025
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Ejecutar en Desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 🗄️ Configuración de Supabase

### Paso 1: Crear Proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Guarda las credenciales (URL y ANON_KEY)

### Paso 2: Ejecutar Migraciones SQL

Ve a **SQL Editor** en Supabase y ejecuta las migraciones **EN ESTE ORDEN**:

#### **Migración 1: Sistema de Permisos y Usuarios**
```sql
-- Ejecutar: supabase/migrations/001_users_and_permissions.sql
```
Crea tablas: `profiles`, `role_permissions`, `user_custom_permissions`, `project_members`

#### **Migración 2: Función Super Admin**
```sql
-- Ejecutar: supabase/migrations/002_create_super_admin.sql
```
Crea función para promover usuarios a super_admin

#### **Migración 3: Esquema de Empresas**
```sql
-- Ejecutar: supabase/migrations/003_update_companies_schema.sql
```
Actualiza tabla `companies` con campos necesarios

#### **Migración 4: Políticas RLS de Empresas**
```sql
-- Ejecutar: supabase/migrations/004_fix_companies_rls.sql
```
Configura Row Level Security para empresas

#### **Migración 5: Políticas RLS de Producción**
```sql
-- Ejecutar: supabase/migrations/005_production_rls_policies.sql
```
Políticas RLS completas para todos los módulos

#### **Migración 6: Mejoras en Proyectos**
```sql
-- Ejecutar: supabase/migrations/006_enhance_projects_schema.sql
```
Mejora esquema de proyectos

#### **Migración 7: Sistema Fiduciario**
```sql
-- Ejecutar: supabase/migrations/007_fiduciary_system_working.sql
```
Sistema completo de cuentas fiduciarias

#### **Migración 8: Fix Sistema Fiduciario**
```sql
-- Ejecutar: supabase/migrations/008_fix_fiduciary_system.sql
```
Correcciones de RLS para sistema fiduciario

#### **Migración 9: Administración de Estilos**
```sql
-- Ejecutar: supabase/migrations/009_style_administration.sql
```
Sistema de personalización de estilos y branding

#### **Migración 10: Políticas de Storage**
```sql
-- Ejecutar: supabase/migrations/010_storage_policies.sql
```
Políticas para almacenamiento de archivos

#### **Migración 11: Métricas y Roles de Empresa**
```sql
-- Ejecutar: supabase/migrations/011_performance_and_company_roles.sql
```
Sistema de métricas de rendimiento y permisos por empresa

#### **Migración 12: Fix Creación de Usuarios**
```sql
-- Ejecutar: supabase/migrations/012_fix_user_creation_rls.sql
```
Correcciones finales de RLS para creación de usuarios

### Paso 3: Configurar Storage

#### **Bucket: company-logos**
1. Ve a **Storage** en Supabase
2. Crea bucket `company-logos`
3. Configuración:
   - **Public**: ✅ Sí
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/*`

#### **Bucket: global-branding**
1. Crea bucket `global-branding`
2. Configuración:
   - **Public**: ✅ Sí
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/*`

### Paso 4: Crear Usuario Super Admin

1. **Registra un usuario** en la aplicación con tu email
2. **Ejecuta en SQL Editor**:
```sql
SELECT public.promote_to_super_admin('tu-email@ejemplo.com');
```

---

## 🚀 Despliegue a Producción

### Opción 1: Vercel (Recomendado)

#### **Despliegue Automático**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tausePro/ti2025)

#### **Despliegue Manual**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplegar
vercel --prod
```

#### **Configurar Variables de Entorno en Vercel**
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (tu dominio de producción)

### Opción 2: Otros Servicios

El proyecto es compatible con:
- **Netlify**
- **Railway**
- **Render**
- **AWS Amplify**

---

## ✅ Verificación del Sistema

### 1. Verificar Tablas Creadas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. Verificar Políticas RLS
```sql
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

### 3. Verificar Permisos de Usuario
```sql
SELECT * FROM get_user_permissions('user-uuid');
```

### 4. Verificar Storage Buckets
```sql
SELECT * FROM storage.buckets;
```

### 5. Verificar Usuario Super Admin
```sql
SELECT id, email, role, full_name 
FROM profiles 
WHERE role = 'super_admin';
```

---

## 🔐 Sistema de Permisos

### Roles Disponibles
1. **super_admin** - Acceso total al sistema
2. **admin** - Gestión completa excepto configuración global
3. **gerente** - Supervisión y aprobaciones
4. **supervisor** - Operaciones de campo
5. **residente** - Registro de bitácoras
6. **cliente** - Solo visualización

### Módulos y Acciones
- **Módulos**: `projects`, `reports`, `financial`, `users`, `companies`, `bitacora`
- **Acciones**: `create`, `read`, `update`, `delete`, `approve`, `sign`, `assign`

### Uso en Código
```typescript
import { usePermissions } from '@/hooks/usePermissions'

function MyComponent() {
  const { hasPermission } = usePermissions()
  
  if (hasPermission('projects', 'create')) {
    // Mostrar botón crear proyecto
  }
}
```

---

## 🐛 Troubleshooting

### Error: Cannot connect to Supabase
**Solución:**
1. Verifica que las variables de entorno estén correctas
2. Confirma que el proyecto de Supabase esté activo
3. Revisa la consola del navegador para más detalles

### Error: RLS policy denies access
**Solución:**
```sql
-- Verificar que el usuario tenga perfil
SELECT * FROM profiles WHERE email = 'usuario@ejemplo.com';

-- Si no existe, crear perfil
INSERT INTO profiles (id, email, full_name, role)
VALUES ('auth-user-uuid', 'usuario@ejemplo.com', 'Nombre', 'residente');
```

### Error: Cannot upload files
**Solución:**
1. Verifica que los buckets existan
2. Confirma que las políticas de storage estén configuradas
3. Ejecuta `supabase/migrations/010_storage_policies.sql`

### Error: Build fails in production
**Solución:**
```bash
# Limpiar cache
rm -rf .next
npm run build

# Verificar tipos
npm run type-check
```

### Usuario no puede ver proyectos
**Solución:**
```sql
-- Asignar usuario al proyecto
INSERT INTO project_members (project_id, user_id, role, is_active)
VALUES ('project-uuid', 'user-uuid', 'residente', true);
```

---

## 📊 Funcionalidades Implementadas

### ✅ Completadas
- Sistema de autenticación con Supabase Auth
- Gestión de proyectos (CRUD completo)
- Gestión de empresas cliente
- Sistema fiduciario (cuentas SIFI, órdenes de pago)
- Permisos granulares por rol y usuario
- Upload de archivos (logos, documentos)
- Personalización de estilos y branding
- Métricas de rendimiento
- PWA (Progressive Web App)
- CI/CD con GitHub Actions

### 🔄 En Desarrollo
- Módulo de bitácoras completo
- Sistema de reportes con PDF
- Chat en tiempo real
- Notificaciones push
- Sincronización offline

---

## 📞 Soporte

### Recursos
- **Documentación**: Este archivo
- **Migraciones SQL**: `supabase/migrations/`
- **Scripts de verificación**: `scripts/verification/`
- **Archivos históricos**: `docs/archive/`

### Contacto
- **Email**: felipe@tause.co
- **GitHub Issues**: [Crear issue](https://github.com/tausePro/ti2025/issues)

---

## 🔒 Seguridad en Producción

### Checklist de Seguridad
- [ ] RLS habilitado en todas las tablas
- [ ] Variables de entorno configuradas correctamente
- [ ] HTTPS habilitado
- [ ] Backups automáticos configurados
- [ ] Logs de auditoría activados
- [ ] Rate limiting configurado
- [ ] CORS configurado correctamente

### Buenas Prácticas
1. **Nunca desactives RLS** en producción
2. **Usa HTTPS** siempre
3. **Configura backups** regulares en Supabase
4. **Monitorea logs** constantemente
5. **Actualiza dependencias** regularmente
6. **Rota credenciales** periódicamente

---

**Desarrollado con ❤️ por TausePro**

*Última actualización: Octubre 2025*
