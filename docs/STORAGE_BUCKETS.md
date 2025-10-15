# 📦 Buckets de Storage - TausePro

Documentación de los buckets de Supabase Storage disponibles en el proyecto.

## 🗂️ Buckets Existentes

### 1. `project-documents` 
**Uso:** Documentos de proyectos y comprobantes de pago
- **Público:** ✅ Sí
- **Tamaño máximo:** Sin límite
- **Tipos permitidos:** Todos
- **Casos de uso:**
  - Comprobantes de pago (`payment-proofs/`)
  - Documentos de proyectos
  - Contratos
  - Actas de obra

**Políticas RLS:**
- ✅ Usuarios autenticados pueden subir
- ✅ Todos pueden ver
- ✅ Usuarios pueden eliminar sus propios documentos (o admins)

**Ejemplo de uso:**
```typescript
const { data, error } = await supabase.storage
  .from('project-documents')
  .upload(`payment-proofs/${orderId}-${Date.now()}.pdf`, file)
```

---

### 2. `signatures`
**Uso:** Firmas digitales de usuarios
- **Público:** ✅ Sí
- **Tamaño máximo:** Sin límite
- **Tipos permitidos:** Todos
- **Estructura:** `{userId}/signature.png`

**Políticas RLS:**
- ✅ Usuarios pueden subir su propia firma
- ✅ Usuarios pueden actualizar su propia firma
- ✅ Usuarios pueden eliminar su propia firma
- ✅ Todos pueden ver firmas

**Ejemplo de uso:**
```typescript
const { data, error } = await supabase.storage
  .from('signatures')
  .upload(`${userId}/signature.png`, file)
```

---

### 3. `avatars`
**Uso:** Fotos de perfil de usuarios
- **Público:** ✅ Sí
- **Tamaño máximo:** Sin límite
- **Tipos permitidos:** Todos
- **Estructura:** `{userId}/avatar.jpg`

**Políticas RLS:**
- ✅ Usuarios pueden subir su propio avatar
- ✅ Usuarios pueden actualizar su propio avatar
- ✅ Usuarios pueden eliminar su propio avatar
- ✅ Todos pueden ver avatars

**Ejemplo de uso:**
```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file)
```

---

### 4. `branding-assets`
**Uso:** Assets de branding (logos, iconos)
- **Público:** ✅ Sí
- **Tamaño máximo:** 5MB
- **Tipos permitidos:** JPG, PNG, GIF, WEBP, SVG
- **Casos de uso:**
  - Logos de empresas
  - Iconos personalizados
  - Assets de marca

---

### 5. `branding-assets-public`
**Uso:** Assets de branding públicos (duplicado)
- **Público:** ✅ Sí
- **Tamaño máximo:** 5MB
- **Tipos permitidos:** JPG, PNG, GIF, WEBP, SVG

**⚠️ Nota:** Parece ser un duplicado de `branding-assets`. Considerar consolidar.

---

## 📋 Convenciones de Nomenclatura

### Estructura de carpetas recomendada:

```
project-documents/
├── payment-proofs/
│   └── {orderId}-{timestamp}.{ext}
├── contracts/
│   └── {projectId}/
│       └── {contractName}.pdf
├── construction-acts/
│   └── {projectId}/
│       └── {actNumber}.pdf
└── reports/
    └── {projectId}/
        └── {reportId}.pdf

signatures/
└── {userId}/
    └── signature.png

avatars/
└── {userId}/
    └── avatar.{ext}

branding-assets/
├── logos/
│   └── {companyId}/
│       └── logo.{ext}
└── icons/
    └── {iconName}.{ext}
```

---

## 🔒 Seguridad

### Políticas RLS Activas:
- ✅ Solo usuarios autenticados pueden subir archivos
- ✅ Los usuarios solo pueden eliminar sus propios archivos (excepto admins)
- ✅ Todos los buckets son públicos para lectura
- ✅ Las carpetas de usuario están protegidas por `storage.foldername(name)[1] = auth.uid()`

### Recomendaciones:
1. **Siempre validar el tipo de archivo** en el frontend antes de subir
2. **Usar nombres únicos** con timestamp para evitar colisiones
3. **Organizar en carpetas** por proyecto/usuario para mejor gestión
4. **Considerar hacer `project-documents` privado** si contiene información sensible

---

## 🚀 Próximos Pasos

### Buckets a considerar crear:
- `daily-logs-photos` - Fotos de bitácoras diarias (público, 10MB, imágenes)
- `reports-pdf` - PDFs de informes generados (privado, 20MB, PDF)
- `temp-uploads` - Uploads temporales con auto-eliminación (privado, 10MB)

### Mejoras sugeridas:
1. Agregar límites de tamaño a `project-documents`, `signatures`, `avatars`
2. Restringir tipos MIME en `project-documents` para mayor seguridad
3. Consolidar `branding-assets` y `branding-assets-public`
4. Implementar auto-eliminación de archivos temporales
