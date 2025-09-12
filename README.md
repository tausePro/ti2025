# Talento Inmobiliario - Plataforma PWA de Supervisión Técnica

Una aplicación web progresiva (PWA) desarrollada para Talento Inmobiliario S.A.S, empresa de supervisión técnica de obras de construcción en Colombia. El sistema permite a residentes de obra capturar información diaria (bitácoras), generar informes quincenales/mensuales con flujo de aprobación y firma digital, y gestionar interventoría administrativa.

## 🚀 Características Principales

### ✅ Funcionalidades Implementadas

- **Autenticación y Roles**: Sistema completo de autenticación con roles (admin, gerente, supervisor, residente, cliente)
- **Gestión de Proyectos**: CRUD completo con asignación de equipos y tipos de interventoría
- **Bitácora Diaria**: Formularios dinámicos con captura de fotos, campos personalizables y funcionamiento offline
- **Sincronización Offline**: IndexedDB con cola de sincronización automática
- **Módulo Financiero**: Gestión de órdenes de pago, actas de construcción y control presupuestal
- **Generación de Informes**: Creación automática de PDFs con datos de bitácoras
- **PWA Completa**: Service Worker, manifest, instalación en dispositivos móviles

### 🔄 En Desarrollo

- **Flujo de Aprobación**: Estados de informes con notificaciones por email
- **Firmas Digitales**: Aplicación automática de firmas en PDFs
- **Chat en Tiempo Real**: Comunicación por proyecto usando Supabase Realtime

## 🛠 Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui con Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Offline**: IndexedDB con Dexie.js, Service Worker
- **PDF**: jsPDF para generación de informes
- **Estado**: TanStack Query para manejo de estado del servidor
- **Email**: Resend para notificaciones

## 📁 Estructura del Proyecto

```
/app
  /(auth)
    /login/page.tsx          # Página de inicio de sesión
  /(dashboard)
    /layout.tsx              # Layout principal con navegación
    /dashboard/page.tsx      # Dashboard con estadísticas
    /projects/               # Gestión de proyectos
      /page.tsx             # Lista de proyectos
      /new/page.tsx         # Crear nuevo proyecto
    /bitacora/              # Bitácoras diarias
      /page.tsx             # Lista de bitácoras
      /new/page.tsx         # Nueva bitácora con fotos
    /reports/page.tsx        # Gestión de informes
    /financial/page.tsx      # Interventoría administrativa
  /globals.css              # Estilos globales con variables CSS
  /layout.tsx               # Layout raíz con PWA

/components
  /ui/                      # Componentes base de shadcn/ui
    /button.tsx
    /card.tsx
    /input.tsx
    /badge.tsx
    /toast.tsx

/lib
  /supabase.ts             # Configuración de Supabase
  /offline.ts              # Gestión offline con IndexedDB
  /pdf-generator.ts        # Generación de PDFs
  /utils.ts                # Utilidades generales

/hooks
  /usePermissions.ts       # Hook para manejo de permisos por rol
  /useOfflineSync.ts       # Hook para sincronización offline

/types
  /database.ts             # Tipos TypeScript para la base de datos

/public
  /manifest.json           # Manifest PWA
  /sw.js                   # Service Worker
```

## 🗄 Esquema de Base de Datos

### Tablas Principales

- **users**: Usuarios con roles y permisos
- **companies**: Empresas contratantes
- **projects**: Proyectos con configuración personalizable
- **project_team**: Asignación de usuarios a proyectos
- **daily_logs**: Bitácoras diarias con campos dinámicos
- **daily_log_photos**: Fotos de bitácoras con metadatos
- **reports**: Informes quincenales/mensuales
- **report_signatures**: Firmas digitales de informes
- **fiduciary_accounts**: Cuentas fiduciarias (SIFI)
- **payment_orders**: Órdenes de pago
- **construction_acts**: Actas de construcción
- **chat_messages**: Mensajes de chat por proyecto
- **notifications**: Sistema de notificaciones

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- Cuenta de Resend (opcional, para emails)

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd talento2025
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
RESEND_API_KEY=tu_clave_de_resend
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Configurar Supabase**

Ejecutar las migraciones SQL en tu proyecto de Supabase usando el esquema proporcionado en la documentación.

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

6. **Construir para producción**
```bash
npm run build
npm start
```

## 📱 Funcionalidades PWA

### Instalación
- La aplicación se puede instalar en dispositivos móviles y desktop
- Funciona offline con sincronización automática
- Notificaciones push (próximamente)

### Offline First
- Todas las bitácoras se guardan localmente primero
- Sincronización automática cuando hay conexión
- Indicadores visuales de estado de conexión
- Cola de sincronización con reintentos automáticos

## 👥 Roles y Permisos

### Administrador
- Acceso completo a todas las funcionalidades
- Gestión de usuarios y empresas
- Configuración del sistema

### Gerente
- Gestión de proyectos
- Aprobación y firma de informes
- Acceso a módulo financiero completo

### Supervisor
- Supervisión de proyectos asignados
- Aprobación de informes
- Vista de información financiera

### Residente
- Creación de bitácoras diarias
- Generación de informes
- Firma de informes propios

### Cliente
- Vista de informes finalizados
- Acceso limitado a información del proyecto

## 🔧 Desarrollo

### Comandos Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run start        # Servidor de producción
npm run lint         # Ejecutar ESLint
npm run type-check   # Verificar tipos TypeScript
```

### Convenciones de Código

- Archivos de componentes React: PascalCase.tsx
- Utilidades y hooks: camelCase.ts
- Un componente por archivo
- Preferir componentes de servidor por defecto
- Usar 'use client' cuando sea necesario
- TypeScript estricto en toda la aplicación

## 📋 Estado del Proyecto

### ✅ Completado (Día 1)
- [x] Setup del proyecto Next.js 14 con TypeScript
- [x] Configuración de Supabase y esquema de BD
- [x] Sistema de autenticación y middleware
- [x] Layout responsive con navegación
- [x] CRUD de proyectos con asignación de equipo
- [x] Formulario de bitácora con campos dinámicos
- [x] Captura de fotos con etiquetas
- [x] Sistema offline con IndexedDB
- [x] Generación básica de PDFs
- [x] Módulo de interventoría administrativa
- [x] Configuración PWA básica

### 🔄 En Progreso
- [ ] Flujo completo de aprobación de informes
- [ ] Sistema de firmas digitales
- [ ] Chat en tiempo real por proyecto
- [ ] Notificaciones push
- [ ] Optimizaciones de rendimiento

### 📈 Próximas Funcionalidades
- [ ] Dashboard con gráficas avanzadas
- [ ] Exportación a Excel
- [ ] Integración con APIs externas
- [ ] Modo oscuro
- [ ] Múltiples idiomas

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto es propiedad de Talento Inmobiliario S.A.S. Todos los derechos reservados.

## 📞 Soporte

Para soporte técnico o consultas sobre el proyecto, contactar al equipo de desarrollo.

---

**Desarrollado con ❤️ para Talento Inmobiliario S.A.S**
