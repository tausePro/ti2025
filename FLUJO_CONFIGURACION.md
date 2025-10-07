# 🔄 Flujo de Configuración del Sistema - Talento Inmobiliario

**Orden jerárquico de configuración del sistema**

---

## 📋 Flujo Completo (De Arriba Hacia Abajo)

```
1. ROLES
   ↓
2. PERMISOS
   ↓
3. USUARIOS
   ↓
4. EMPRESAS (CLIENTES)
   ↓
5. PROYECTOS
   ↓
6. EQUIPOS DE TRABAJO
   ↓
7. CONFIGURACIONES ESPECÍFICAS
```

---

## 1️⃣ GESTIÓN DE ROLES

### **Ubicación**: `/admin/users/roles`

### **Estado**: ✅ COMPLETO

**Funcionalidades**:
- ✅ Ver 6 roles predefinidos
- ✅ Editar permisos por rol
- ✅ Ver matriz de permisos
- ✅ Guardar cambios en BD

**Roles Disponibles**:
1. **super_admin** - Acceso total
2. **admin** - Gestión completa (sin eliminaciones críticas)
3. **gerente** - Supervisión y aprobaciones
4. **supervisor** - Operaciones de campo
5. **residente** - Registro de bitácoras
6. **cliente** - Solo visualización

**Módulos Configurables**:
- projects (Proyectos)
- reports (Reportes)
- financial (Financiero)
- users (Usuarios)
- companies (Empresas)
- bitacora (Bitácora)

**Acciones Configurables**:
- create, read, update, delete
- approve, sign, assign

---

## 2️⃣ GESTIÓN DE PERMISOS

### **Ubicación**: `/admin/users/roles` (integrado)

### **Estado**: ✅ COMPLETO

**Tipos de Permisos**:

### **A. Permisos por Rol** (role_permissions)
- Definidos en la gestión de roles
- Aplican a todos los usuarios con ese rol
- Base de permisos del sistema

### **B. Permisos Personalizados** (user_custom_permissions)
- Por usuario específico
- Sobrescriben permisos de rol
- Se gestionan en `/admin/users/[id]/permissions`

### **C. Permisos por Empresa** (user_company_permissions)
- Por usuario en empresa específica
- Roles dentro de la empresa
- Permisos específicos de empresa

---

## 3️⃣ GESTIÓN DE USUARIOS

### **Ubicación**: `/admin/users`

### **Estado**: ✅ COMPLETO

**Funcionalidades**:
- ✅ Listar usuarios
- ✅ Crear usuario (`/admin/users/new`)
- ✅ Editar usuario (`/admin/users/[id]/edit`)
- ✅ Asignar rol
- ✅ Permisos personalizados (`/admin/users/[id]/permissions`)
- ✅ Activar/desactivar usuarios

**Flujo de Creación**:
1. Ir a `/admin/users/new`
2. Llenar datos básicos (nombre, email, teléfono)
3. Asignar rol (super_admin, admin, gerente, etc.)
4. Crear usuario
5. (Opcional) Asignar permisos personalizados

---

## 4️⃣ GESTIÓN DE EMPRESAS (CLIENTES)

### **Ubicación**: `/admin/companies`

### **Estado**: ✅ COMPLETO

**Funcionalidades**:
- ✅ Listar empresas
- ✅ Crear empresa (`/admin/companies/new`)
- ✅ Editar empresa (`/admin/companies/[id]/edit`)
- ✅ Upload de logo
- ✅ Información fiscal (NIT, dirección, etc.)
- ✅ Activar/desactivar

**Datos de Empresa**:
- Nombre comercial
- Razón social
- NIT
- Tipo (cliente, contratista, proveedor)
- Dirección, teléfono, email
- Logo
- Representante legal
- Estado (activo/inactivo)

---

## 5️⃣ GESTIÓN DE PROYECTOS

### **Ubicación**: `/projects`

### **Estado**: ⚠️ PARCIAL - Falta configuración completa

**Funcionalidades Actuales**:
- ✅ Listar proyectos
- ✅ Crear proyecto básico (`/projects/new`)
- ✅ Editar proyecto (`/projects/[id]/edit`)
- ✅ Filtros y búsqueda
- ✅ Vista de tarjetas/lista

**Funcionalidades Faltantes**:
- [ ] **Configuración Fiduciaria**
  - Cuentas SIFI 1 y 2
  - Configuración financiera
  - Órdenes de pago
  
- [ ] **Configuración de Interventoría**
  - Tipo de interventoría
  - Configuraciones específicas
  
- [ ] **Documentos del Proyecto**
  - Contratos
  - Actas
  - Planos
  
- [ ] **Cronograma**
  - Hitos
  - Actividades
  - Fechas clave

**Datos Básicos de Proyecto**:
- Código de proyecto
- Nombre
- Empresa cliente
- Dirección/ubicación
- Tipo de intervención
- Fechas (inicio, fin)
- Presupuesto
- Estado (planificación, activo, suspendido, completado)
- Progreso (%)

---

## 6️⃣ ASIGNACIÓN DE EQUIPOS DE TRABAJO

### **Ubicación**: `/projects/[id]/team`

### **Estado**: ✅ COMPLETO

**Funcionalidades Implementadas**:

### **A. Asignar Usuarios a Proyecto** ✅
```
Proyecto → Agregar Miembro → Seleccionar Usuario → Asignar Rol en Proyecto
```

**Roles en Proyecto**:
- Supervisor ✅
- Residente ✅
- Ayudante ✅
- Especialista ✅

**Tabla**: `project_members` ✅
- project_id
- user_id
- role_in_project
- assigned_at
- assigned_by
- is_active

### **B. Gestionar Equipo** ✅
- ✅ Ver miembros actuales
- ✅ Buscar y filtrar usuarios disponibles
- ✅ Asignar rol en proyecto
- ✅ Remover del proyecto
- ✅ Resumen por tipo de rol (supervisores, residentes, etc.)

**Componentes Creados**:
- `app/(dashboard)/projects/[id]/team/page.tsx`
- `components/projects/AddTeamMemberDialog.tsx`

---

## 7️⃣ CONFIGURACIONES ESPECÍFICAS

### **A. Configuración Fiduciaria** ✅

**Ubicación**: `/projects/[id]/fiduciary` y `/projects/[id]/config`

**Estado**: ✅ COMPLETO

**Páginas Creadas**:
- `app/(dashboard)/projects/[id]/fiduciary/page.tsx` ✅
- `app/(dashboard)/projects/[id]/config/page.tsx` ✅

**Funcionalidades**:
- ✅ Cuenta SIFI 1 (datos, saldo)
- ✅ Cuenta SIFI 2 (datos, saldo)
- ✅ Configuración financiera
- ✅ Tipo de pago (actas vs legalizaciones)
- ✅ Validación de tipo de intervención
- ✅ Sistema de tabs (General, Fiduciaria, Documentos, Cronograma)

### **B. Configuración de Estilos** ✅

**Ubicación**: `/admin/config`

**Estado**: ✅ COMPLETO

**Configurar**:
- ✅ Logo global
- ✅ Colores primarios/secundarios
- ✅ Branding personalizado

---

## 📊 Checklist de Configuración Inicial

### **Para Nuevo Sistema**:

- [ ] **1. Configurar Roles** (`/admin/users/roles`)
  - [ ] Revisar permisos de cada rol
  - [ ] Ajustar según necesidades
  - [ ] Guardar cambios

- [ ] **2. Crear Usuarios** (`/admin/users/new`)
  - [ ] Crear super_admin inicial
  - [ ] Crear admins
  - [ ] Crear usuarios operativos

- [ ] **3. Crear Empresas Cliente** (`/admin/companies/new`)
  - [ ] Registrar empresas cliente
  - [ ] Subir logos
  - [ ] Completar datos fiscales

- [ ] **4. Crear Proyectos** (`/projects/new`)
  - [ ] Datos básicos
  - [ ] Asignar empresa cliente
  - [ ] Configurar fechas y presupuesto

- [ ] **5. Configurar Proyecto** (Pendiente implementar)
  - [ ] Configuración fiduciaria (si aplica)
  - [ ] Configuración de interventoría
  - [ ] Documentos iniciales

- [ ] **6. Asignar Equipo** (Pendiente implementar)
  - [ ] Asignar supervisor
  - [ ] Asignar residentes
  - [ ] Asignar especialistas

- [ ] **7. Configuración Global** (`/admin/config`)
  - [ ] Logo de la empresa
  - [ ] Colores corporativos
  - [ ] Branding

---

## 🚀 Próximos Pasos de Implementación

### **Prioridad 1: Asignación de Equipos** 🔥
**Tiempo estimado**: 4-6 horas

Crear:
1. Página `/projects/[id]/team`
2. Componente `TeamAssignment.tsx`
3. Modal para agregar miembros
4. Gestión de roles en proyecto

### **Prioridad 2: Configuración Completa de Proyectos** 🔥
**Tiempo estimado**: 6-8 horas

Integrar:
1. Formulario fiduciario en creación/edición
2. Configuración de interventoría
3. Sección de documentos
4. Cronograma básico

### **Prioridad 3: Importación desde Excel** 📊
**Tiempo estimado**: 4-6 horas

Implementar:
1. Importar empresas desde Excel
2. Importar proyectos desde Excel
3. Importar usuarios desde Excel

---

## 📝 Notas Importantes

### **Orden de Operación**:
1. **Nunca** crear proyectos sin empresas
2. **Nunca** asignar equipos sin usuarios
3. **Siempre** configurar roles antes de crear usuarios
4. **Verificar** permisos antes de dar acceso

### **Dependencias**:
- Usuarios dependen de Roles
- Proyectos dependen de Empresas
- Equipos dependen de Usuarios y Proyectos
- Permisos personalizados dependen de Usuarios

---

**Última actualización**: 6 de Octubre, 2025
