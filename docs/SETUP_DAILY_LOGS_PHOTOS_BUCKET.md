# 📸 Setup: Bucket daily-logs-photos

Guía paso a paso para configurar el bucket de fotos de bitácoras en Supabase.

## 1️⃣ Crear el Bucket

**Ejecuta en Supabase SQL Editor:**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'daily-logs-photos',
  'daily-logs-photos',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;
```

## 2️⃣ Crear Políticas RLS

Ve a **Storage > daily-logs-photos > Policies** en el Dashboard de Supabase.

### Política 1: INSERT (Subir fotos)

- **Name:** `Authenticated users can upload daily log photos`
- **Policy Command:** `INSERT`
- **Target roles:** `authenticated`
- **WITH CHECK expression:**
```sql
bucket_id = 'daily-logs-photos'
```

---

### Política 2: SELECT (Ver fotos)

- **Name:** `Anyone can view daily log photos`
- **Policy Command:** `SELECT`
- **Target roles:** `public`
- **USING expression:**
```sql
bucket_id = 'daily-logs-photos'
```

---

### Política 3: UPDATE (Actualizar fotos)

- **Name:** `Users can update their own daily log photos`
- **Policy Command:** `UPDATE`
- **Target roles:** `authenticated`
- **USING expression:**
```sql
bucket_id = 'daily-logs-photos' AND auth.uid()::text = (storage.foldername(name))[1]
```
- **WITH CHECK expression:**
```sql
bucket_id = 'daily-logs-photos' AND auth.uid()::text = (storage.foldername(name))[1]
```

---

### Política 4: DELETE (Eliminar fotos)

- **Name:** `Users can delete their own daily log photos or admins can delete any`
- **Policy Command:** `DELETE`
- **Target roles:** `authenticated`
- **USING expression:**
```sql
bucket_id = 'daily-logs-photos' AND (
  auth.uid()::text = (storage.foldername(name))[1]
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
)
```

---

## 3️⃣ Verificar Configuración

**Ejecuta para verificar:**

```sql
-- Ver bucket creado
SELECT * FROM storage.buckets WHERE id = 'daily-logs-photos';

-- Ver políticas creadas
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%daily log photos%';
```

---

## 4️⃣ Probar Upload

**Código de prueba en el frontend:**

```typescript
const { data, error } = await supabase.storage
  .from('daily-logs-photos')
  .upload(
    `${userId}/${projectId}/${dailyLogId}/${Date.now()}.jpg`, 
    file,
    {
      cacheControl: '3600',
      upsert: false
    }
  )

if (error) {
  console.error('Error uploading:', error)
} else {
  console.log('Uploaded:', data.path)
  
  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('daily-logs-photos')
    .getPublicUrl(data.path)
  
  console.log('Public URL:', publicUrl)
}
```

---

## ✅ Checklist

- [ ] Bucket creado con límite de 10MB
- [ ] Tipos MIME configurados (imágenes)
- [ ] Bucket marcado como público
- [ ] Política INSERT creada
- [ ] Política SELECT creada
- [ ] Política UPDATE creada
- [ ] Política DELETE creada
- [ ] Prueba de upload exitosa

---

## 🔒 Seguridad

- ✅ Solo usuarios autenticados pueden subir
- ✅ Todos pueden ver (bucket público)
- ✅ Solo el dueño puede actualizar/eliminar sus fotos
- ✅ Admins pueden eliminar cualquier foto
- ✅ Límite de 10MB por archivo
- ✅ Solo formatos de imagen permitidos
