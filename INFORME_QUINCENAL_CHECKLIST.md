# ✅ CHECKLIST: Sistema de Informes Quincenales

## 📊 ESTADO ACTUAL
- [x] Tablas creadas: `biweekly_reports`, `report_templates`, `section_templates`
- [x] 12 secciones activas en BD
- [x] WYSIWYG editor (TipTap) funcionando
- [x] API `/api/reports/generate-content` creada
- [x] Función `collect_report_data()` RPC existe
- [ ] **FLUJO COMPLETO NO FUNCIONA**

---

## 🎯 FASE 1: CARGAR SECCIONES PRECONFIGURADAS
**Objetivo:** Al abrir la página, cargar las secciones con contenido base

### Frontend: `/app/(dashboard)/reports/biweekly/new/page.tsx`
- [ ] 1.1. Al cargar página, obtener `section_templates` de la BD
- [ ] 1.2. Cargar `content_template` de cada sección
- [ ] 1.3. Inicializar estado `content` con templates
- [ ] 1.4. Mostrar cada sección en el WYSIWYG con contenido base
- [ ] 1.5. Permitir edición manual del residente

**Archivos a modificar:**
- `app/(dashboard)/reports/biweekly/new/page.tsx` (líneas 70-80)

---

## 🤖 FASE 2: GENERACIÓN CON IA (COMPLEMENTAR, NO REEMPLAZAR)
**Objetivo:** IA complementa lo que el residente escribió + datos de bitácoras/QC

### API: `/app/api/reports/generate-content/route.ts`
- [ ] 2.1. Recibir `content` actual del residente (lo que ya editó)
- [ ] 2.2. Obtener datos de bitácoras (`daily_logs`)
- [ ] 2.3. Obtener datos de control de calidad (`quality_control_samples`)
- [ ] 2.4. Para cada sección:
  - [ ] 2.4.1. Tomar contenido editado por residente
  - [ ] 2.4.2. Agregar datos de bitácoras/QC relevantes
  - [ ] 2.4.3. IA **complementa** (no reemplaza) el contenido
  - [ ] 2.4.4. Retornar contenido enriquecido
- [ ] 2.5. Guardar en `biweekly_reports.content` (JSONB)

**Archivos a modificar:**
- `app/api/reports/generate-content/route.ts` (líneas 95-180)

---

## 💾 FASE 3: GUARDAR BORRADOR AUTOMÁTICO
**Objetivo:** Guardar en BD automáticamente después de generar

### Frontend: `/app/(dashboard)/reports/biweekly/new/page.tsx`
- [x] 3.1. Después de generar con IA, llamar `handleSaveDraft()`
- [ ] 3.2. Crear registro en `biweekly_reports` con estado `draft`
- [ ] 3.3. Guardar `content` (JSONB) con todas las secciones
- [ ] 3.4. Guardar `source_data` (datos de bitácoras/QC)
- [ ] 3.5. Actualizar `reportId` en estado local
- [ ] 3.6. Permitir seguir editando

**Archivos a modificar:**
- `app/(dashboard)/reports/biweekly/new/page.tsx` (líneas 135-190)

---

## 📝 FASE 4: PUBLICAR INFORME
**Objetivo:** Residente publica para revisión de Santiago

### Frontend: `/app/(dashboard)/reports/biweekly/new/page.tsx`
- [ ] 4.1. Botón "Enviar para Revisión"
- [ ] 4.2. Validar que todas las secciones tengan contenido
- [ ] 4.3. Actualizar estado a `submitted`
- [ ] 4.4. Guardar `submitted_at` y `submitted_by`
- [ ] 4.5. Generar PDF preliminar
- [ ] 4.6. Enviar notificación a Santiago

**Archivos a crear/modificar:**
- `app/(dashboard)/reports/biweekly/new/page.tsx` (función `handleSubmit`)
- `app/api/reports/submit/route.ts` (nueva API)
- `app/api/notifications/route.ts` (notificaciones)

---

## 👀 FASE 5: VISTA DE REVISIÓN (SANTIAGO)
**Objetivo:** Santiago puede ver, aprobar o rechazar informes

### Nueva página: `/app/(dashboard)/reports/biweekly/review/page.tsx`
- [ ] 5.1. Listar informes con estado `submitted`
- [ ] 5.2. Ver contenido completo del informe
- [ ] 5.3. Botón "Aprobar"
  - [ ] 5.3.1. Cambiar estado a `approved`
  - [ ] 5.3.2. Guardar `reviewed_at` y `reviewed_by`
  - [ ] 5.3.3. Notificar a gerencia
- [ ] 5.4. Botón "Solicitar Cambios"
  - [ ] 5.4.1. Cambiar estado a `rejected`
  - [ ] 5.4.2. Guardar `rejection_reason`
  - [ ] 5.4.3. Notificar a residente

**Archivos a crear:**
- `app/(dashboard)/reports/biweekly/review/page.tsx` (nueva página)
- `app/api/reports/approve/route.ts` (nueva API)
- `app/api/reports/reject/route.ts` (nueva API)

---

## 📄 FASE 6: GENERACIÓN DE PDF
**Objetivo:** Generar PDF profesional del informe

### API: `/app/api/reports/generate-pdf/route.ts`
- [ ] 6.1. Obtener informe completo de BD
- [ ] 6.2. Obtener plantilla (`report_templates`)
- [ ] 6.3. Aplicar estilos y formato
- [ ] 6.4. Incluir:
  - [ ] 6.4.1. Portada con logo
  - [ ] 6.4.2. Todas las secciones
  - [ ] 6.4.3. Fotos de bitácoras
  - [ ] 6.4.4. Tablas de datos
  - [ ] 6.4.5. Firmas digitales
- [ ] 6.5. Subir PDF a Supabase Storage
- [ ] 6.6. Guardar URL en `biweekly_reports.pdf_url`

**Archivos a crear:**
- `app/api/reports/generate-pdf/route.ts` (nueva API)
- `lib/pdf/report-generator.ts` (lógica de PDF)

---

## 🔔 FASE 7: NOTIFICACIONES
**Objetivo:** Notificar a usuarios en cada cambio de estado

### Sistema de notificaciones
- [ ] 7.1. Residente publica → Notificar Santiago
- [ ] 7.2. Santiago aprueba → Notificar gerencia
- [ ] 7.3. Santiago rechaza → Notificar residente
- [ ] 7.4. Usar tabla `notifications` existente
- [ ] 7.5. Enviar emails (opcional)

**Archivos a crear/modificar:**
- `app/api/notifications/send/route.ts` (nueva API)
- `lib/notifications/report-notifications.ts` (lógica)

---

## 📋 FASE 8: LISTADO DE INFORMES
**Objetivo:** Ver todos los informes creados

### Nueva página: `/app/(dashboard)/reports/biweekly/list/page.tsx`
- [ ] 8.1. Listar informes del usuario
- [ ] 8.2. Filtrar por estado (draft, submitted, approved, rejected)
- [ ] 8.3. Filtrar por proyecto
- [ ] 8.4. Filtrar por fecha
- [ ] 8.5. Ver detalles de cada informe
- [ ] 8.6. Descargar PDF
- [ ] 8.7. Editar borradores
- [ ] 8.8. Reenviar rechazados

**Archivos a crear:**
- `app/(dashboard)/reports/biweekly/list/page.tsx` (nueva página)

---

## 🔐 FASE 9: PERMISOS Y RLS
**Objetivo:** Asegurar que solo usuarios autorizados accedan

### Políticas RLS en `biweekly_reports`
- [ ] 9.1. Residentes ven solo sus informes
- [ ] 9.2. Santiago ve informes de sus proyectos
- [ ] 9.3. Gerencia ve informes aprobados
- [ ] 9.4. Super admin ve todo

**Archivos a modificar:**
- `supabase/migrations/071_biweekly_reports_clean.sql` (políticas RLS)

---

## 🧪 FASE 10: TESTING
**Objetivo:** Probar flujo completo

### Casos de prueba
- [ ] 10.1. Residente crea informe desde cero
- [ ] 10.2. Residente edita secciones manualmente
- [ ] 10.3. Residente genera con IA
- [ ] 10.4. Residente guarda borrador
- [ ] 10.5. Residente publica informe
- [ ] 10.6. Santiago recibe notificación
- [ ] 10.7. Santiago aprueba informe
- [ ] 10.8. Gerencia recibe notificación
- [ ] 10.9. Santiago rechaza informe
- [ ] 10.10. Residente recibe notificación y corrige
- [ ] 10.11. PDF se genera correctamente
- [ ] 10.12. Sesión persiste en recargas

---

## 🐛 BUGS CONOCIDOS A CORREGIR
- [ ] BUG-1: Sesión se cierra al recargar página
- [ ] BUG-2: Rol cambia después de recarga
- [ ] BUG-3: API genera error 500 sin mensaje claro
- [ ] BUG-4: No se cargan secciones preconfiguradas
- [ ] BUG-5: Contenido generado no se guarda en BD

---

## 📝 NOTAS IMPORTANTES
- **NO reemplazar** contenido del residente, solo complementar
- **Usar** datos de `daily_logs` y `quality_control_samples`
- **Generar PDF** solo cuando se publica
- **Notificar** en cada cambio de estado
- **Permitir** múltiples versiones del mismo informe
- **Mantener** historial de cambios

---

## 🚀 ORDEN DE IMPLEMENTACIÓN SUGERIDO
1. ✅ FASE 1: Cargar secciones preconfiguradas (BASE) - COMPLETADA
2. ⏳ FASE 3: Guardar borrador automático (PERSISTENCIA) - EN PROGRESO
3. ⏳ FASE 2: Generación con IA (COMPLEMENTAR) - PARCIAL
4. ⏳ FASE 4: Publicar informe (WORKFLOW)
5. ⏳ FASE 5: Vista de revisión (SANTIAGO)
6. ⏳ FASE 7: Notificaciones (COMUNICACIÓN)
7. ⏳ FASE 6: Generación de PDF (OUTPUT)
8. ⏳ FASE 8: Listado de informes (GESTIÓN)
9. ⏳ FASE 9: Permisos y RLS (SEGURIDAD)
10. ⏳ FASE 10: Testing (CALIDAD)

---

## 📝 PROGRESO ACTUAL

### ✅ COMPLETADO:
- Cargar section_templates al iniciar página
- Inicializar content con content_template
- Mostrar contenido base en editores WYSIWYG
- Permitir edición manual del residente
- IA complementa (no reemplaza) contenido del residente
- Enviar currentContent a API

### ⏳ EN PROGRESO:
- Guardar borrador automáticamente después de generar
- Verificar que secciones existen en BD

### ❌ PENDIENTE:
- Publicar informe
- Vista de revisión
- Notificaciones
- Generación de PDF
- Listado de informes

---

**ÚLTIMA ACTUALIZACIÓN:** 2025-11-04 23:08
**PRÓXIMO PASO:** Verificar secciones en BD y completar guardado automático
