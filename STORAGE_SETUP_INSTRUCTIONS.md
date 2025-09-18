# Configuración de Supabase Storage para Logos

## Problema
El error "Bucket not found" aparece porque no tienes configurado el almacenamiento de archivos en Supabase.

## Solución

### 1. Obtener la Service Role Key
1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia la **service_role** key (no la anon key)

### 2. Agregar la clave al archivo .env.local
Agrega esta línea a tu archivo `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### 3. Ejecutar el script de configuración
```bash
node setup-storage-service-role.js
```

### 4. Verificar que funciona
1. Recarga la página de configuración de estilos
2. El error "Bucket not found" debería desaparecer
3. Podrás subir logos, favicons y banners

## Archivos que se crearán
- Bucket: `branding-assets`
- Políticas RLS para permitir subida de archivos
- Configuración para imágenes (JPEG, PNG, GIF, WebP, SVG)

## Tamaño máximo de archivo
- 5MB por archivo
- Tipos permitidos: JPEG, PNG, GIF, WebP, SVG
