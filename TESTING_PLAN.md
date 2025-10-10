# 📋 Plan de Testing - Talento Inmobiliario

## 🎯 Objetivo
Testear roles, permisos y funcionalidades antes de enviar credenciales a los dueños.

---

## 👥 Usuarios de Prueba

### 1. **Yuliana - Administradora**
- **Email**: yuliana@talentoinmobiliario.com
- **Rol**: `admin`
- **Permisos**:
  - ✅ Crear y gestionar empresas cliente
  - ✅ Crear y configurar proyectos
  - ✅ Crear y gestionar usuarios
  - ✅ Asignar equipos de trabajo
  - ✅ Ver módulo financiero (solo en proyectos con service_type = 'technical_financial')
  - ✅ Ver dashboard general

### 2. **Adriana - Gerente**
- **Email**: adriana@talentoinmobiliario.com
- **Rol**: `gerente`
- **Permisos**:
  - ✅ Ver todos los proyectos
  - ✅ Ver todas las bitácoras
  - ✅ Crear/editar sus propias bitácoras
  - ✅ Gestionar usuarios
  - ✅ Aprobar reportes

### 3. **Santiago - Supervisor**
- **Email**: santiago@talentoinmobiliario.com
- **Rol**: `supervisor`
- **Permisos**:
  - ✅ Ver proyectos donde es miembro
  - ✅ Gestionar bitácoras de sus proyectos
  - ✅ Gestionar usuarios
  - ✅ Crear reportes

### 4. **Carlos - Residente**
- **Email**: carlos@talentoinmobiliario.com
- **Rol**: `residente`
- **Permisos**:
  - ✅ Ver proyectos donde es miembro
  - ✅ Crear y editar SOLO sus propias bitácoras
  - ❌ NO ve bitácoras de otros residentes
  - ✅ Crear reportes de campo

### 5. **María - Cliente**
- **Email**: cliente@empresatest.com
- **Rol**: `cliente`
- **Permisos**:
  - ✅ Ver proyectos de su empresa
  - ✅ Ver informes finales compartidos
  - ✅ Ver avance de obra
  - ❌ NO ve bitácoras en tiempo real
  - ❌ NO puede crear ni modificar nada (solo lectura)

---

## 📝 Pasos de Testing

### **PASO 1: Registrar Yuliana (Admin)**

1. Ir a `/register`
2. Registrar con email: `yuliana@talentoinmobiliario.com`
3. **Login como super_admin** (tu usuario actual)
4. Ir a **Usuarios** → Buscar a Yuliana → **Editar**
5. Cambiar rol a `admin`
6. Cambiar nombre completo a `Yuliana Rodríguez`
7. Agregar teléfono: `3001234567`
8. **Guardar cambios**

✅ **Ya NO es necesario ejecutar SQL manualmente**

### **PASO 2: Yuliana crea empresas cliente**

1. Login como Yuliana
2. Ir a **Empresas** → **Nueva Empresa**
3. Crear 2 empresas de prueba:
   - **Constructora ABC S.A.S.**
   - **Inmobiliaria XYZ Ltda.**

### **PASO 3: Yuliana crea proyectos**

Crear 2 proyectos diferentes:

#### **Proyecto 1: Solo Técnico**
- **Nombre**: Edificio Residencial Los Pinos
- **Empresa**: Constructora ABC S.A.S.
- **Service Type**: `technical` (Solo interventoría técnica)
- **Intervention Types**: `interventoria_tecnica`
- **Resultado esperado**: NO debe mostrar tab "Financiero"

#### **Proyecto 2: Técnico + Financiero**
- **Nombre**: Centro Comercial Plaza Mayor
- **Empresa**: Inmobiliaria XYZ Ltda.
- **Service Type**: `technical_financial`
- **Intervention Types**: `interventoria_tecnica`, `interventoria_administrativa`
- **Resultado esperado**: SÍ debe mostrar tab "Financiero"

### **PASO 4: Yuliana crea usuarios**

1. Ir a **Usuarios** → **Nuevo Usuario**
2. Crear los 4 usuarios restantes:

```
Adriana García
Email: adriana@talentoinmobiliario.com
Rol: gerente
Teléfono: 3007654321

Santiago Martínez
Email: santiago@talentoinmobiliario.com
Rol: supervisor
Teléfono: 3009876543

Carlos López
Email: carlos@talentoinmobiliario.com
Rol: residente
Teléfono: 3005551234

María Cliente
Email: cliente@empresatest.com
Rol: cliente
Teléfono: 3004445566
```

### **PASO 5: Asignar usuarios a proyectos**

En cada proyecto, agregar miembros del equipo:
- Santiago (supervisor)
- Carlos (residente)

### **PASO 6: Testing de Bitácoras**

#### **Como Carlos (Residente)**
1. Login como Carlos
2. Ir al proyecto asignado
3. Crear una bitácora diaria
4. Verificar que SOLO ve sus propias bitácoras

#### **Como Santiago (Supervisor)**
1. Login como Santiago
2. Ir al proyecto asignado
3. Verificar que ve TODAS las bitácoras del proyecto
4. Crear una bitácora
5. Editar bitácoras existentes

#### **Como Adriana (Gerente)**
1. Login como Adriana
2. Verificar que ve TODOS los proyectos
3. Verificar que ve TODAS las bitácoras
4. Crear bitácoras en cualquier proyecto

### **PASO 7: Testing de Módulo Financiero**

1. Ir al **Proyecto 1** (Solo Técnico)
   - ❌ NO debe aparecer tab "Financiero"

2. Ir al **Proyecto 2** (Técnico + Financiero)
   - ✅ SÍ debe aparecer tab "Financiero"
   - Yuliana debe poder ver y gestionar:
     - Cuentas fiduciarias
     - Órdenes de pago
     - Movimientos financieros

### **PASO 8: Testing de Cliente**

1. Login como María (Cliente)
2. Verificar que SOLO ve proyectos de su empresa
3. Verificar que NO ve bitácoras
4. Verificar que NO puede crear nada
5. Verificar que puede ver informes finales

---

## ✅ Checklist de Validación

### **Roles y Permisos**
- [ ] Yuliana (admin) puede crear empresas
- [ ] Yuliana (admin) puede crear proyectos
- [ ] Yuliana (admin) puede crear usuarios
- [ ] Adriana (gerente) puede gestionar usuarios
- [ ] Santiago (supervisor) puede gestionar usuarios
- [ ] Carlos (residente) solo ve sus bitácoras
- [ ] María (cliente) solo lectura

### **Proyectos**
- [ ] Proyecto técnico NO muestra tab financiero
- [ ] Proyecto técnico+financiero SÍ muestra tab financiero
- [ ] Miembros del equipo asignados correctamente

### **Bitácoras**
- [ ] Residente puede crear bitácoras
- [ ] Residente solo ve sus propias bitácoras
- [ ] Supervisor ve todas las bitácoras del proyecto
- [ ] Gerente ve todas las bitácoras de todos los proyectos
- [ ] Cliente NO ve bitácoras

### **Módulo Financiero**
- [ ] Solo visible en proyectos con service_type = 'technical_financial'
- [ ] Admin puede gestionar cuentas fiduciarias
- [ ] Admin puede crear órdenes de pago

---

## 📧 Credenciales para Enviar a los Dueños

Una vez completado el testing, enviar estas credenciales:

```
YULIANA RODRÍGUEZ (Administradora)
Email: yuliana@talentoinmobiliario.com
Contraseña: [Generada por el sistema]
Rol: Administrador
Acceso: Completo

ADRIANA GARCÍA (Gerente)
Email: adriana@talentoinmobiliario.com
Contraseña: [Generada por el sistema]
Rol: Gerente
Acceso: Supervisión y gestión

SANTIAGO MARTÍNEZ (Supervisor)
Email: santiago@talentoinmobiliario.com
Contraseña: [Generada por el sistema]
Rol: Supervisor
Acceso: Operaciones de campo

CARLOS LÓPEZ (Residente)
Email: carlos@talentoinmobiliario.com
Contraseña: [Generada por el sistema]
Rol: Residente
Acceso: Bitácoras propias

MARÍA CLIENTE (Cliente)
Email: cliente@empresatest.com
Contraseña: [Generada por el sistema]
Rol: Cliente
Acceso: Solo lectura
```

---

## 🐛 Registro de Issues

Documentar aquí cualquier problema encontrado durante el testing:

| Issue | Descripción | Rol Afectado | Estado |
|-------|-------------|--------------|--------|
| | | | |

---

## 📊 Métricas de Testing

- **Fecha de inicio**: ___________
- **Fecha de finalización**: ___________
- **Issues encontrados**: ___________
- **Issues resueltos**: ___________
- **Estado general**: ⬜ Pendiente ⬜ En Progreso ⬜ Completado
