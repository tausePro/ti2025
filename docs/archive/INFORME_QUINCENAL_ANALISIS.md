# 🔍 ANÁLISIS: Sistema de Informes Quincenales - Pivoteo

## 📊 LO QUE YA EXISTE Y FUNCIONA

### 1. **Plantillas Globales** (`/admin/report-templates`)
**Ubicación:** `app/(dashboard)/admin/report-templates/page.tsx`

**Qué hace:**
- ✅ Lista plantillas globales de informes
- ✅ Permite crear/editar plantillas
- ✅ Configuración de header, footer, estilos
- ✅ Tabla: `report_templates`

**Qué NO hace:**
- ❌ No asocia plantillas a proyectos específicos
- ❌ No permite escribir contenido base de secciones
- ❌ No relaciona con bitácoras/QC del proyecto

**Estructura actual:**
```sql
report_templates:
  - id
  - template_name
  - template_type
  - header_config (JSONB)
  - footer_config (JSONB)
  - styles (JSONB)
  - sections (JSONB) ← Solo flags booleanos, no contenido
  - company_id (NULL = global)
```

---

### 2. **Documentos del Proyecto** (`/projects/[id]/documents`)
**Ubicación:** `app/(dashboard)/projects/[id]/documents/page.tsx`

**Qué hace:**
- ✅ Subir archivos al proyecto (logos, contratos, reportes, fotos, planos)
- ✅ Organizar por tipo de archivo
- ✅ Descargar y eliminar documentos
- ✅ Tabla: `project_documents`

**Qué NO hace:**
- ❌ No genera informes automáticamente
- ❌ No relaciona documentos con plantillas
- ❌ No inserta contenido en informes

**Estructura actual:**
```sql
project_documents:
  - id
  - project_id
  - file_name
  - file_url
  - file_type (logo|contract|report|photo|drawing|other)
  - uploaded_by
  - is_public
```

---

### 3. **Reportes de Control de Calidad** (`/quality-control/reports`)
**Ubicación:** `app/(dashboard)/quality-control/reports/page.tsx`

**Qué hace:**
- ✅ Lista muestras de control de calidad por proyecto
- ✅ Filtra por estado y fecha
- ✅ Muestra ensayos realizados
- ✅ Tabla: `quality_control_samples`

**Qué NO hace:**
- ❌ No se inserta automáticamente en informes
- ❌ No hay relación con `section_templates`
- ❌ No hay placeholders para insertar en plantillas

**Estructura actual:**
```sql
quality_control_samples:
  - id
  - project_id
  - sample_number
  - sample_code
  - sample_date
  - location
  - status
  - overall_result
  - template_id (referencia a quality_templates)
```

---

### 4. **Crear Informe Quincenal** (`/reports/biweekly/new`)
**Ubicación:** `app/(dashboard)/reports/biweekly/new/page.tsx`

**Qué hace:**
- ✅ Carga `section_templates` globales
- ✅ Inicializa contenido con `content_template`
- ✅ Editor WYSIWYG (TipTap) para cada sección
- ✅ Botón "Generar con IA" (intenta generar desde cero)
- ✅ Guarda en `biweekly_reports`

**Qué NO hace:**
- ❌ No usa plantilla específica del proyecto
- ❌ No inserta datos de bitácoras automáticamente
- ❌ No inserta datos de QC automáticamente
- ❌ IA genera en lugar de revisar

**Estructura actual:**
```sql
biweekly_reports:
  - id
  - project_id
  - report_number
  - period_start
  - period_end
  - content (JSONB) ← Contenido de secciones
  - source_data (JSONB) ← Datos recopilados
  - status (draft|submitted|approved|rejected)
```

---

## 🎯 LO QUE FALTA CONSTRUIR

### **A. Plantillas por Proyecto**

**Tabla nueva:** `project_report_templates`
```sql
CREATE TABLE project_report_templates (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  template_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Funcionalidad:**
- Santiago selecciona un proyecto
- Crea/edita plantilla específica para ese proyecto
- Define secciones con contenido base
- Configura qué datos insertar (bitácoras, QC, fotos)

**Vista nueva:** `/projects/[id]/report-template`

---

### **B. Secciones con Contenido Base y Placeholders**

**Tabla modificada:** `section_templates`
```sql
ALTER TABLE section_templates ADD COLUMN:
  - project_template_id UUID (en lugar de report_template_id global)
  - base_content TEXT (contenido escrito por Santiago)
  - data_mappings JSONB (qué datos insertar)
```

**Ejemplo de sección:**
```json
{
  "section_key": "control_calidad",
  "section_name": "Control de Calidad",
  "base_content": "<h3>Ensayos Realizados</h3><p>Durante el período se realizaron los siguientes ensayos de control de calidad:</p>{{qc_samples_table}}<p>Observaciones: {{qc_observations}}</p>",
  "data_mappings": {
    "qc_samples_table": {
      "source": "quality_control_samples",
      "filters": {
        "project_id": "{{project_id}}",
        "sample_date": "BETWEEN {{period_start}} AND {{period_end}}"
      },
      "format": "table",
      "columns": ["sample_code", "sample_date", "location", "overall_result"]
    },
    "qc_observations": {
      "source": "quality_control_samples",
      "field": "observations",
      "format": "list"
    }
  }
}
```

---

### **C. Motor de Inserción Automática**

**Función nueva:** `generate_report_from_template()`
```typescript
async function generateReportFromTemplate(
  projectId: string,
  periodStart: string,
  periodEnd: string
) {
  // 1. Obtener plantilla del proyecto
  const template = await getProjectTemplate(projectId)
  
  // 2. Para cada sección:
  for (const section of template.sections) {
    // 3. Obtener datos según data_mappings
    const data = await fetchDataForSection(section, projectId, periodStart, periodEnd)
    
    // 4. Reemplazar placeholders con datos reales
    const content = replacePlaceholders(section.base_content, data)
    
    // 5. Guardar en biweekly_reports.content
    reportContent[section.section_key] = content
  }
  
  return reportContent
}
```

**Ubicación:** `app/api/reports/generate-from-template/route.ts`

---

### **D. Asistente IA (Revisor)**

**Función modificada:** `app/api/reports/ai-review/route.ts`

**Qué hace:**
```typescript
async function reviewReport(reportContent: any) {
  const prompt = `
    Eres un ingeniero civil revisor de informes.
    
    INFORME A REVISAR:
    ${JSON.stringify(reportContent)}
    
    ANALIZA:
    1. Coherencia entre secciones
    2. Inconsistencias en datos
    3. Omisiones importantes
    4. Patrones de riesgo
    
    RESPONDE EN JSON:
    {
      "inconsistencies": ["..."],
      "suggestions": ["..."],
      "risk_patterns": ["..."],
      "missing_items": ["..."]
    }
  `
  
  const review = await openai.chat.completions.create({...})
  return review
}
```

**NO genera contenido, solo revisa y sugiere.**

---

## 🔄 FLUJO REDISEÑADO

### **1. Configuración (Santiago)**
```
/projects/[id]/report-template
├── Crear plantilla para el proyecto
├── Agregar secciones
│   ├── Escribir contenido base
│   ├── Insertar placeholders: {{bitacora.actividades}}
│   └── Configurar data_mappings
└── Activar plantilla
```

### **2. Trabajo Diario (Residente)**
```
/projects/[id]/daily-logs (ya existe)
/quality-control/samples (ya existe)
├── Llenar bitácoras
└── Registrar ensayos QC
```

### **3. Generar Informe (Residente)**
```
/reports/biweekly/new
├── Seleccionar proyecto y período
├── Clic en "Generar Informe"
│   ├── Sistema toma plantilla del proyecto
│   ├── Inserta datos de bitácoras
│   ├── Inserta datos de QC
│   ├── Reemplaza placeholders
│   └── Genera borrador completo
├── Clic en "Revisar con IA" (opcional)
│   └── IA analiza y sugiere mejoras
├── Residente edita manualmente
└── Clic en "Enviar para Revisión"
```

### **4. Revisión (Santiago)**
```
/reports/biweekly/review
├── Ver informe completo
├── Aprobar o rechazar
└── Notificar residente/gerencia
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### **FASE 1: Plantillas por Proyecto** ⏳
- [ ] Crear tabla `project_report_templates`
- [ ] Modificar `section_templates` para soportar proyecto
- [ ] Crear vista `/projects/[id]/report-template`
- [ ] Permitir a Santiago escribir contenido base
- [ ] Configurar placeholders y data_mappings

### **FASE 2: Motor de Inserción** ⏳
- [ ] Crear función `generate_report_from_template()`
- [ ] Implementar reemplazo de placeholders
- [ ] Obtener datos de bitácoras del período
- [ ] Obtener datos de QC del período
- [ ] Formatear datos (tablas, listas, etc.)

### **FASE 3: Asistente IA Revisor** ⏳
- [ ] Modificar API para revisar (no generar)
- [ ] Implementar análisis de coherencia
- [ ] Detectar inconsistencias
- [ ] Sugerir mejoras
- [ ] Alertar omisiones

### **FASE 4: Flujo de Aprobación** ⏳
- [ ] Vista de revisión para Santiago
- [ ] Botones aprobar/rechazar
- [ ] Notificaciones
- [ ] Generación de PDF final

---

## 🎯 RESUMEN EJECUTIVO

**LO QUE TENEMOS:**
- ✅ Plantillas globales (pero sin contenido base)
- ✅ Documentos del proyecto (pero no integrados)
- ✅ Control de calidad (pero no insertado en informes)
- ✅ Editor de informes (pero sin datos automáticos)

**LO QUE NECESITAMOS:**
- 🔨 Plantillas específicas por proyecto
- 🔨 Contenido base escrito por Santiago
- 🔨 Placeholders y data_mappings
- 🔨 Motor de inserción automática
- 🔨 IA como revisor (no generador)

**ESTRATEGIA:**
1. Pivotear plantillas globales → plantillas por proyecto
2. Agregar contenido base y placeholders a secciones
3. Construir motor de inserción automática
4. Cambiar IA de generador a revisor
5. Completar flujo de aprobación

---

**PRÓXIMO PASO:** ¿Empezamos con FASE 1 (Plantillas por Proyecto)?
