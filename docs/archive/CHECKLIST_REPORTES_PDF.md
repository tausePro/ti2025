# 📋 CHECKLIST: Sistema de Reportes PDF con IA

**Proyecto:** TausePro - Talento Inmobiliario  
**Fecha inicio:** 24 Oct 2025  
**Estimación:** 6-8 horas  

---

## 🎯 FASE 1: FUNDACIÓN (2-3 horas)

### 1.1 Base de Datos ✅
- [ ] Ejecutar migración `051_report_system.sql`
- [ ] Ejecutar migración `052_reports_storage.sql`
- [ ] Verificar tablas creadas en Supabase
- [ ] Verificar bucket `reports` creado
- [ ] Verificar políticas RLS activas

### 1.2 Dependencias
- [ ] Instalar `@react-pdf/renderer`
- [ ] Instalar `openai` (para IA)
- [ ] Configurar variables de entorno:
  ```env
  OPENAI_API_KEY=sk-...
  AI_MODEL=gpt-4-turbo-preview
  AI_MAX_TOKENS=1500
  ```

### 1.3 Estructura de Carpetas
```
/components/reports/
  ├── pdf/                    # Componentes PDF
  ├── generators/             # Generadores por tipo
  └── ui/                     # UI para configuración
/app/api/reports/             # API routes
/types/reports.ts             # TypeScript types
```

- [ ] Crear estructura de carpetas
- [ ] Crear archivo de tipos TypeScript

### 1.4 Componentes Base PDF
- [ ] `PDFDocument.tsx` - Wrapper principal
- [ ] `PDFHeader.tsx` - Encabezado configurable
- [ ] `PDFFooter.tsx` - Pie de página
- [ ] `PDFStyles.ts` - Estilos reutilizables

---

## 🎨 FASE 2: MEMBRETE CONFIGURABLE (1-2 horas)

### 2.1 Panel de Administración
- [ ] Página `/admin/report-templates`
- [ ] Lista de plantillas existentes
- [ ] Botón "Crear Nueva Plantilla"
- [ ] Botón "Editar" por plantilla

### 2.2 Formulario de Configuración
- [ ] **Tab 1: Información Básica**
  - [ ] Nombre de plantilla
  - [ ] Tipo de reporte (dropdown)
  - [ ] Marcar como predeterminada
  
- [ ] **Tab 2: Encabezado**
  - [ ] Upload de logo
  - [ ] Nombre de empresa
  - [ ] Texto personalizado
  - [ ] Colores (picker)
  - [ ] Altura del encabezado
  
- [ ] **Tab 3: Pie de Página**
  - [ ] Mostrar números de página
  - [ ] Mostrar fecha de generación
  - [ ] Texto personalizado
  - [ ] Incluir firmas
  
- [ ] **Tab 4: Estilos Generales**
  - [ ] Color primario
  - [ ] Color secundario
  - [ ] Tamaño de página (A4/Carta)
  - [ ] Orientación (vertical/horizontal)
  - [ ] Márgenes
  
- [ ] **Tab 5: Secciones**
  - [ ] Checkboxes para cada sección
  - [ ] Portada
  - [ ] Resumen ejecutivo
  - [ ] Insights de IA
  - [ ] Bitácoras detalladas
  - [ ] Fotos
  - [ ] Checklists
  - [ ] Firmas

### 2.3 Vista Previa
- [ ] Componente de vista previa en tiempo real
- [ ] Actualización al cambiar configuración
- [ ] Botón "Guardar Plantilla"

### 2.4 Componentes Dinámicos
- [ ] `PDFHeader.tsx` lee config de BD
- [ ] `PDFFooter.tsx` lee config de BD
- [ ] Aplicar estilos dinámicamente

---

## 📊 FASE 3: REPORTE SEMANAL (2-3 horas)

### 3.1 UI de Generación
- [ ] Botón "Generar Reporte" en `/projects/[id]/daily-logs`
- [ ] Modal con opciones:
  - [ ] Selector de rango de fechas
  - [ ] Tipo de reporte (semanal/mensual/personalizado)
  - [ ] Incluir fotos (sí/no)
  - [ ] Incluir análisis IA (sí/no)
  - [ ] Plantilla a usar (dropdown)
- [ ] Botón "Generar PDF"
- [ ] Loading state con progreso

### 3.2 Componentes del Reporte
- [ ] `PDFCoverPage.tsx`
  - [ ] Logo del proyecto
  - [ ] Nombre y código
  - [ ] Período del reporte
  - [ ] Fecha de generación
  
- [ ] `PDFExecutiveSummary.tsx`
  - [ ] Total de bitácoras
  - [ ] Personal promedio
  - [ ] Clima predominante
  - [ ] Estadísticas de checklists
  - [ ] Gráficas simples
  
- [ ] `PDFDailyLogSection.tsx`
  - [ ] Por cada bitácora:
    - [ ] Fecha, hora, clima
    - [ ] Actividades
    - [ ] Materiales y equipos
    - [ ] Observaciones
    - [ ] Problemas
  
- [ ] `PDFChecklistTable.tsx`
  - [ ] Tabla con resultados
  - [ ] Colores por estado
  - [ ] Porcentaje de cumplimiento
  
- [ ] `PDFCustomFields.tsx`
  - [ ] Renderizar campos personalizados
  - [ ] Formato según tipo de campo
  
- [ ] `PDFPhotoGrid.tsx`
  - [ ] Grid 2-3 columnas
  - [ ] Miniaturas con descripción
  - [ ] Página de anexo con fotos grandes
  
- [ ] `PDFSignatures.tsx`
  - [ ] Firmas digitales
  - [ ] Nombre y rol
  - [ ] Fecha de firma

### 3.3 Generador Principal
- [ ] `DailyLogReportGenerator.tsx`
- [ ] Cargar datos del proyecto
- [ ] Cargar bitácoras del período
- [ ] Cargar plantilla seleccionada
- [ ] Ensamblar todas las secciones
- [ ] Generar PDF
- [ ] Retornar blob

---

## 🤖 FASE 4: INTEGRACIÓN IA (1-2 horas)

### 4.1 API de Análisis
- [ ] `/api/reports/analyze-with-ai.ts`
- [ ] Recibir datos de bitácoras
- [ ] Formatear prompt para OpenAI
- [ ] Llamar a OpenAI API
- [ ] Parsear respuesta
- [ ] Retornar análisis estructurado

### 4.2 Prompt Engineering
- [ ] Prompt para resumen ejecutivo
- [ ] Prompt para identificar logros
- [ ] Prompt para detectar problemas
- [ ] Prompt para recomendaciones
- [ ] Prompt para predicciones

### 4.3 Componente de IA
- [ ] `PDFAIInsights.tsx`
- [ ] Sección "Análisis Inteligente"
- [ ] Subsecciones:
  - [ ] Resumen ejecutivo
  - [ ] Principales logros
  - [ ] Áreas de preocupación
  - [ ] Recomendaciones
  - [ ] Tendencias identificadas

### 4.4 Cache de Análisis
- [ ] Guardar análisis en `generated_reports.ai_summary`
- [ ] No regenerar si ya existe
- [ ] Opción de forzar regeneración

---

## 💾 FASE 5: ALMACENAMIENTO (1 hora)

### 5.1 Subida a Storage
- [ ] Función `uploadReportToStorage()`
- [ ] Usar service_role key para subir (bypass RLS)
- [ ] Generar nombre único: `PROJ-XXX_weekly_2025-10-21.pdf`
- [ ] Subir a bucket `reports/daily-logs/weekly/`
- [ ] Obtener URL firmada (signed URL) para acceso
- [ ] Manejar errores

**IMPORTANTE:** Los reportes se GENERAN desde la plataforma, no los suben usuarios.
El backend usa service_role key para subir los PDFs generados.

### 5.2 Registro en BD
- [ ] Insertar en `generated_reports`
- [ ] Guardar metadata (stats)
- [ ] Guardar análisis IA
- [ ] Actualizar estado a 'completed'

### 5.3 Historial de Reportes
- [ ] Página `/projects/[id]/reports`
- [ ] Tabla con reportes generados:
  - [ ] Tipo de reporte
  - [ ] Período
  - [ ] Fecha de generación
  - [ ] Tamaño del archivo
  - [ ] Generado por
  - [ ] Botón "Ver"
  - [ ] Botón "Descargar"
  - [ ] Botón "Eliminar" (admin)

### 5.4 Visualización
- [ ] Abrir PDF en nueva pestaña
- [ ] Incrementar contador de vistas
- [ ] Incrementar contador de descargas
- [ ] Actualizar `last_accessed_at`

---

## 🧪 FASE 6: TESTING Y OPTIMIZACIÓN (1 hora)

### 6.1 Tests Funcionales
- [ ] Crear plantilla nueva
- [ ] Editar plantilla existente
- [ ] Generar reporte semanal
- [ ] Generar reporte mensual
- [ ] Verificar todas las secciones
- [ ] Verificar fotos en PDF
- [ ] Verificar análisis IA
- [ ] Descargar PDF
- [ ] Ver historial

### 6.2 Tests de Rendimiento
- [ ] Reporte con 10 bitácoras
- [ ] Reporte con 50 bitácoras
- [ ] Reporte con 100+ fotos
- [ ] Tiempo de generación < 10 seg

### 6.3 Tests de Permisos
- [ ] Usuario solo ve reportes de sus proyectos
- [ ] Admin ve todos los reportes
- [ ] No se puede acceder a reportes de otros proyectos

### 6.4 Optimizaciones
- [ ] Comprimir imágenes antes de incluir
- [ ] Lazy loading de fotos
- [ ] Cache de plantillas
- [ ] Paginación en historial

---

## 📱 EXTRAS (Opcional)

### Notificaciones
- [ ] Email cuando el reporte esté listo
- [ ] Notificación in-app

### Programación
- [ ] Generar reportes automáticamente (semanal)
- [ ] Cron job para limpieza de reportes antiguos

### Compartir
- [ ] Generar link temporal para compartir
- [ ] Expiración de links (7 días)

---

## ✅ CRITERIOS DE ACEPTACIÓN

- [ ] ✅ Santiago puede configurar plantillas desde el panel
- [ ] ✅ Se pueden generar reportes semanales con datos reales
- [ ] ✅ El PDF incluye todas las secciones configuradas
- [ ] ✅ Las fotos se muestran correctamente
- [ ] ✅ El análisis IA genera insights útiles
- [ ] ✅ Los reportes se guardan en Supabase Storage
- [ ] ✅ El historial muestra todos los reportes generados
- [ ] ✅ Los permisos funcionan correctamente
- [ ] ✅ El rendimiento es aceptable (< 10 seg)
- [ ] ✅ El diseño es profesional y legible

---

## 📝 NOTAS IMPORTANTES

1. **Migraciones SQL:** Ya están listas en:
   - `051_report_system.sql`
   - `052_reports_storage.sql`

2. **Variables de entorno:** Agregar a `.env.local`:
   ```env
   OPENAI_API_KEY=sk-...
   AI_MODEL=gpt-4-turbo-preview
   AI_MAX_TOKENS=1500
   ```

3. **Costos IA:** ~$0.01 por reporte (muy económico)

4. **Límites:**
   - PDF máximo: 50MB
   - Fotos por reporte: Ilimitadas (pero comprimir)
   - Bitácoras por reporte: Ilimitadas

5. **Backup:** Los reportes se guardan 6 meses, luego se archivan

---

## 🚀 ORDEN DE EJECUCIÓN

1. ✅ Ejecutar migraciones SQL
2. ✅ Instalar dependencias
3. ✅ Crear estructura de carpetas
4. ✅ Implementar componentes base
5. ✅ Crear panel de configuración
6. ✅ Implementar generador de reportes
7. ✅ Integrar IA
8. ✅ Implementar almacenamiento
9. ✅ Testing completo
10. ✅ Deploy y validación

---

**Estado actual:** ⏸️ Listo para comenzar  
**Próximo paso:** Ejecutar migraciones SQL
