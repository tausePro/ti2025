# 🏗️ Talento Inmobiliario - Sistema de Supervisión Técnica

Sistema completo de supervisión técnica para obras de construcción con PWA, gestión de proyectos y despliegue continuo.

## ✨ Características Principales

- 🏗️ **Gestión de Proyectos**: CRUD completo de proyectos de construcción
- 🏢 **Gestión de Empresas**: Administración de empresas cliente
- 📊 **Reportes**: Generación automática de informes
- 📱 **PWA**: Aplicación web progresiva para móviles
- 🔐 **Autenticación**: Sistema robusto con roles y permisos
- 📋 **Bitácora**: Registro detallado de actividades
- 💰 **Módulo Financiero**: Control de costos y presupuestos
- 🚀 **Despliegue Continuo**: CI/CD con GitHub Actions + Vercel

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **UI**: shadcn/ui, Radix UI, Lucide React
- **PWA**: Workbox, Service Worker
- **Validación**: Zod, React Hook Form
- **Despliegue**: Vercel, GitHub Actions
- **Base de Datos**: PostgreSQL con Row Level Security

## 🚀 Despliegue Rápido

### Opción 1: Vercel (Recomendado)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tausePro/ti2025)

### Opción 2: Despliegue Manual

1. **Clona el repositorio**
```bash
git clone https://github.com/tausePro/ti2025.git
cd ti2025
```

2. **Instala dependencias**
```bash
npm install
```

3. **Configura variables de entorno**
```bash
cp .env.example .env.local
```

4. **Configura Supabase**
   - Crea un proyecto en [Supabase](https://supabase.com)
   - Ejecuta las migraciones SQL en `supabase/migrations/`
   - Configura las variables de entorno

5. **Ejecuta en desarrollo**
```bash
npm run dev
```

## 🔧 Configuración de Producción

### Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Vercel (opcional)
VERCEL_TOKEN=tu_vercel_token
VERCEL_ORG_ID=tu_org_id
VERCEL_PROJECT_ID=tu_project_id
```

### Configuración de Supabase

1. **Ejecuta las migraciones** en orden:
   - `001_users_and_permissions.sql`
   - `002_create_super_admin.sql`
   - `003_update_companies_schema.sql`
   - `004_fix_companies_rls.sql`
   - `005_production_rls_policies.sql`

2. **Configura Storage** para logos de empresas:
   - Crea bucket `company-logos`
   - Configura políticas RLS

3. **Crea usuario administrador**:
   - Email: `admin@talentoinmobiliario.com`
   - Password: `test123`
   - Rol: `super_admin`

## 📁 Estructura del Proyecto

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Páginas de autenticación
│   ├── (dashboard)/       # Dashboard principal
│   ├── api/               # API routes
│   └── globals.css        # Estilos globales
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── companies/        # Gestión de empresas
│   ├── projects/         # Gestión de proyectos
│   └── shared/           # Componentes compartidos
├── contexts/             # Contextos de React
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y configuración
├── types/                # Tipos TypeScript
├── supabase/             # Migraciones de BD
├── .github/workflows/    # GitHub Actions
└── vercel.json          # Configuración Vercel
```

## 🔄 CI/CD Pipeline

El proyecto incluye GitHub Actions para:

- **Test**: Linting, type checking, build verification
- **Deploy**: Despliegue automático a Vercel en push a `master`
- **Security**: Verificación de dependencias

### Workflows Disponibles

- `test.yml` - Ejecuta tests y validaciones
- `deploy.yml` - Despliega a producción

## 📱 PWA Features

- **Offline Support**: Funciona sin conexión
- **Installable**: Se puede instalar como app nativa
- **Push Notifications**: Notificaciones push (próximamente)
- **Background Sync**: Sincronización en segundo plano

## 🔐 Sistema de Autenticación

- **Roles**: `super_admin`, `admin`, `gerente`, `supervisor`, `residente`, `cliente`
- **Permisos**: Sistema granular por módulo y acción
- **RLS**: Row Level Security en PostgreSQL
- **Sessions**: Gestión automática de sesiones

## 🚀 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construcción para producción
npm run start        # Servidor de producción
npm run lint         # Linter de código
npm run type-check   # Verificación de tipos
```

## 🐛 Troubleshooting

### Error de RLS
Si hay problemas con Row Level Security:
```sql
-- Temporalmente deshabilitar RLS para debugging
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
```

### Error de Autenticación
Verificar que el usuario existe en `profiles`:
```sql
SELECT * FROM profiles WHERE email = 'admin@talentoinmobiliario.com';
```

## 📞 Soporte

Para soporte técnico o consultas:
- **Email**: felipe@tause.co
- **GitHub Issues**: [Crear issue](https://github.com/tausePro/ti2025/issues)

## 📄 Licencia

Este proyecto es privado y confidencial. Todos los derechos reservados.

---

**Desarrollado con ❤️ por TausePro**