# 🏗️ Talento Inmobiliario - Sistema de Supervisión Técnica

Sistema completo de supervisión técnica para obras de construcción con PWA, gestión de proyectos y despliegue continuo.

> **📚 Documentación Completa**: Ver [SETUP.md](SETUP.md) para instrucciones detalladas de instalación y configuración.

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

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **UI**: shadcn/ui, Radix UI, Lucide React, Tiptap
- **PWA**: Workbox, Service Worker, Dexie (offline-first)
- **PDF**: @react-pdf/renderer
- **Validación**: Zod, React Hook Form
- **Tests**: Vitest
- **Logging**: Sistema estructurado personalizado
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

## 🔧 Configuración Completa

> **📖 Ver [SETUP.md](SETUP.md)** para instrucciones detalladas paso a paso, incluyendo:
> - Instalación local
> - Configuración de Supabase (90 migraciones, ver [supabase/migrations/README.md](supabase/migrations/README.md))
> - Configuración de Storage
> - Creación de usuario super admin
> - Despliegue a producción
> - Troubleshooting completo

### Inicio Rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/tausePro/ti2025.git
cd ti2025
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Ejecutar en desarrollo
npm run dev
```

## 📁 Estructura del Proyecto

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Páginas de autenticación
│   ├── (dashboard)/       # Dashboard principal
│   └── api/               # API routes
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── companies/        # Gestión de empresas
│   ├── projects/         # Gestión de proyectos
│   └── shared/           # Componentes compartidos
├── contexts/             # Contextos de React
├── hooks/                # Custom hooks (8 hooks personalizados)
├── lib/                  # Utilidades y configuración
│   ├── logger.ts         # Sistema de logging estructurado
│   └── supabase/         # Clientes Supabase
├── types/                # Tipos TypeScript
├── supabase/             # Migraciones de BD
│   ├── migrations/       # 90 migraciones SQL (ver README.md interno)
│   └── fixes-history/    # Scripts históricos y de debug
├── scripts/              # Scripts de utilidad
│   └── verification/     # Scripts de verificación
├── docs/                 # Documentación adicional
│   ├── LOGGING_GUIDE.md  # Guía de logging
│   └── archive/          # Documentación histórica
├── .github/workflows/    # GitHub Actions (CI/CD)
└── SETUP.md             # Guía completa de configuración
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
npm test             # Tests (Vitest)
```

## 📚 Documentación

- **[SETUP.md](SETUP.md)** - Guía completa de instalación y configuración
- **[docs/LOGGING_GUIDE.md](docs/LOGGING_GUIDE.md)** - Guía del sistema de logging
- **[supabase/migrations/README.md](supabase/migrations/README.md)** - Orden canónico de migraciones
- **[supabase/migrations/README_FIDUCIARY.md](supabase/migrations/README_FIDUCIARY.md)** - Sistema fiduciario
- **[docs/archive/](docs/archive/)** - Documentación histórica

## 🐛 Troubleshooting

Ver la sección completa de troubleshooting en [SETUP.md](SETUP.md#-troubleshooting).

### Problemas Comunes

- **Error de RLS**: Verificar políticas en Supabase
- **Error de autenticación**: Confirmar que el usuario tiene perfil en `profiles`
- **Error de build**: Ejecutar `npm run type-check` para ver errores de TypeScript

## 📞 Soporte

Para soporte técnico o consultas:
- **Email**: felipe@tause.co
- **GitHub Issues**: [Crear issue](https://github.com/tausePro/ti2025/issues)
- **Documentación**: Ver archivos en `/docs`

## 📄 Licencia

Este proyecto es privado y confidencial. Todos los derechos reservados.

---

**Desarrollado con ❤️ por TausePro**