# 📊 Auditoría de Vistas - Frontend

## ✅ Vistas Existentes (Funcionando)

### **Dashboard**:
- ✅ `/dashboard` - Dashboard principal

### **Proyectos**:
- ✅ `/projects` - Lista de proyectos
- ✅ `/projects/new` - Crear proyecto
- ✅ `/projects/[id]` - Detalle de proyecto
- ✅ `/projects/[id]/edit` - Editar proyecto
- ✅ `/projects/[id]/team` - Gestión de equipo ⭐ NUEVO
- ✅ `/projects/[id]/documents` - Documentos ⭐ NUEVO
- ✅ `/projects/[id]/fiduciary` - Config fiduciaria ⭐ NUEVO
- ✅ `/projects/[id]/config` - Config general ⭐ NUEVO

### **Admin**:
- ✅ `/admin/companies` - Lista empresas
- ✅ `/admin/companies/new` - Crear empresa
- ✅ `/admin/companies/[id]/edit` - Editar empresa
- ✅ `/admin/users` - Lista usuarios
- ✅ `/admin/users/new` - Crear usuario
- ✅ `/admin/users/[id]/edit` - Editar usuario
- ✅ `/admin/users/[id]/permissions` - Permisos personalizados
- ✅ `/admin/users/roles` - Gestión de roles
- ✅ `/admin/config` - Configuración sistema
- ✅ `/admin/performance` - Métricas de rendimiento

---

## 🔲 Vistas NUEVAS a Implementar

### **1. Bitácoras (PRIORIDAD ALTA)** 📝

#### `/projects/[id]/daily-logs` - Lista de bitácoras
**Funcionalidad**:
- Ver todas las bitácoras del proyecto
- Filtrar por fecha, residente
- Búsqueda
- Crear nueva bitácora
- Ver/editar bitácora existente

**Componentes necesarios**:
- `DailyLogsList.tsx`
- `DailyLogCard.tsx`
- `DailyLogFilters.tsx`

#### `/projects/[id]/daily-logs/new` - Crear bitácora
**Funcionalidad**:
- Formulario dinámico basado en plantilla
- 80% campos base + 20% campos custom
- Upload de fotos
- Modo offline (guardar local)
- Sincronización automática

**Componentes necesarios**:
- `DailyLogForm.tsx` ⭐ CLAVE
- `DynamicFieldRenderer.tsx`
- `PhotoUpload.tsx`
- `OfflineIndicator.tsx`

#### `/projects/[id]/daily-logs/[logId]` - Ver/Editar bitácora
**Funcionalidad**:
- Ver bitácora completa
- Editar si es el creador
- Ver fotos
- Ver historial de cambios

---

### **2. Plantillas de Bitácora (PRIORIDAD ALTA)** 🎨

#### `/projects/[id]/daily-logs/templates` - Gestionar plantillas
**Funcionalidad**:
- Ver plantilla actual
- Configurar campos base (80%)
- Agregar campos custom (20%)
- Mapear campos a secciones de informe
- Solo supervisor puede editar

**Componentes necesarios**:
- `TemplateEditor.tsx` ⭐ CLAVE
- `FieldConfigurator.tsx`
- `FieldMappingEditor.tsx`
- `TemplatePreview.tsx`

---

### **3. Informes (PRIORIDAD ALTA)** 📄

#### `/projects/[id]/reports` - Lista de informes
**Funcionalidad**:
- Ver todos los informes del proyecto
- Filtrar por estado, fecha
- Ver estado del flujo
- Crear informe manual
- Auto-generación quincenal

**Componentes necesarios**:
- `ReportsList.tsx`
- `ReportCard.tsx`
- `ReportStatusBadge.tsx`
- `ReportFilters.tsx`

#### `/projects/[id]/reports/[reportId]` - Ver informe
**Funcionalidad**:
- Ver informe completo
- Ver firmas
- Descargar PDF
- Compartir con cliente (gerente)

**Componentes necesarios**:
- `ReportViewer.tsx`
- `ReportSignatures.tsx`
- `ReportActions.tsx`

#### `/projects/[id]/reports/[reportId]/review` - Revisar informe (Supervisor)
**Funcionalidad**:
- Ver informe generado
- Aprobar o solicitar correcciones
- Agregar comentarios
- Firmar automáticamente al aprobar

**Componentes necesarios**:
- `ReportReviewForm.tsx` ⭐ CLAVE
- `ReportComments.tsx`
- `ApprovalButtons.tsx`

#### `/projects/[id]/reports/[reportId]/sign` - Firmar informe (Gerente)
**Funcionalidad**:
- Ver informe aprobado
- Firmar digitalmente
- Generar PDF final
- Compartir con cliente

**Componentes necesarios**:
- `ReportSignatureForm.tsx` ⭐ CLAVE
- `SignaturePreview.tsx`
- `ShareWithClientButton.tsx`

---

### **4. Módulo Financiero (PRIORIDAD MEDIA)** 💰

#### `/projects/[id]/financial` - Dashboard financiero
**Funcionalidad**:
- Solo visible si `service_type='technical_financial'`
- Solo admin (Yuliana) puede gestionar
- Gerente (Adriana) puede ver
- Resumen de cuentas SIFI
- Balance actual
- Órdenes de pago pendientes

**Componentes necesarios**:
- `FinancialDashboard.tsx` ⭐ CLAVE
- `FiduciaryAccountCard.tsx`
- `PaymentOrdersList.tsx`
- `FinancialSummary.tsx`

#### `/projects/[id]/financial/payment-orders` - Órdenes de pago
**Funcionalidad**:
- Lista de órdenes
- Crear nueva orden
- Marcar como pagada
- Ver movimientos generados

**Componentes necesarios**:
- `PaymentOrdersList.tsx`
- `PaymentOrderForm.tsx`
- `PaymentOrderCard.tsx`

#### `/projects/[id]/financial/movements` - Movimientos fiduciarios
**Funcionalidad**:
- Ver historial de movimientos
- Filtrar por cuenta, tipo
- Ver balance histórico
- Exportar a Excel

**Componentes necesarios**:
- `MovementsList.tsx`
- `MovementCard.tsx`
- `BalanceChart.tsx`

---

### **5. Dashboards Personalizados (PRIORIDAD MEDIA)** 📊

#### `/dashboard` - Mejorar dashboard actual
**Funcionalidad**:
- Widgets según rol del usuario
- Drag & drop para reorganizar
- Configurar widgets visibles
- Datos en tiempo real

**Componentes necesarios**:
- `DashboardGrid.tsx` ⭐ CLAVE
- `WidgetRenderer.tsx`
- `MetricWidget.tsx`
- `ChartWidget.tsx`
- `TableWidget.tsx`
- `ListWidget.tsx`

---

### **6. Configuración de Informes (PRIORIDAD BAJA)** ⚙️

#### `/projects/[id]/reports/config` - Configurar informes
**Funcionalidad**:
- Configurar secciones del informe
- Orden de secciones
- Qué incluir (fotos, clima, etc.)
- Orden de firmas
- Membrete de empresa

**Componentes necesarios**:
- `ReportConfigEditor.tsx`
- `SectionOrderEditor.tsx`
- `SignatureOrderEditor.tsx`
- `LetterheadUpload.tsx`

---

## 📋 Priorización de Desarrollo

### **Fase 1: Bitácoras (Esta semana)** ⭐
1. `DailyLogForm.tsx` - Formulario dinámico
2. `/projects/[id]/daily-logs` - Lista
3. `/projects/[id]/daily-logs/new` - Crear
4. `TemplateEditor.tsx` - Configurar plantillas

**Tiempo estimado**: 2-3 días

### **Fase 2: Informes (Esta semana)**
1. `/projects/[id]/reports` - Lista
2. `ReportReviewForm.tsx` - Revisar (supervisor)
3. `ReportSignatureForm.tsx` - Firmar (gerente)
4. `ReportViewer.tsx` - Ver informe

**Tiempo estimado**: 2-3 días

### **Fase 3: Módulo Financiero (Próxima semana)**
1. `FinancialDashboard.tsx`
2. `/projects/[id]/financial/payment-orders`
3. `/projects/[id]/financial/movements`

**Tiempo estimado**: 2-3 días

### **Fase 4: Dashboards (Próxima semana)**
1. `DashboardGrid.tsx`
2. Widgets por tipo
3. Configuración de widgets

**Tiempo estimado**: 2 días

---

## 🧪 Plan de Testing Local

### **Setup Inicial**:
```bash
# 1. Verificar que el servidor local funciona
npm run dev

# 2. Verificar conexión a Supabase
# 3. Crear usuarios de prueba para cada rol
```

### **Testing por Rol**:

**SUPER_ADMIN**:
- [ ] Login
- [ ] Ver todos los proyectos
- [ ] Acceder a todas las vistas

**ADMIN (Yuliana)**:
- [ ] Login
- [ ] Crear empresa
- [ ] Crear proyecto
- [ ] Acceder a módulo financiero
- [ ] Ver todas las bitácoras

**GERENTE (Adriana)**:
- [ ] Login
- [ ] Ver todos los proyectos
- [ ] Firmar informes
- [ ] Ver resumen financiero

**SUPERVISOR (Santiago)**:
- [ ] Login
- [ ] Ver proyectos asignados
- [ ] Configurar plantilla de bitácora
- [ ] Revisar y aprobar informes

**RESIDENTE**:
- [ ] Login
- [ ] Ver proyecto asignado
- [ ] Crear bitácora
- [ ] Ver sus informes

---

## 🚀 Siguiente Paso

**¿Por dónde empezamos?**

**Opción A**: Bitácoras (DailyLogForm) - Lo más importante ⭐  
**Opción B**: Informes (ReportReviewForm) - Flujo completo  
**Opción C**: Dashboard mejorado - Impacto visual  
**Opción D**: Módulo financiero - Para Yuliana  

**Mi recomendación**: Opción A - Bitácoras, porque es la base de todo el flujo.

**Dime por dónde quieres empezar** 🚀
