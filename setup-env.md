# Configuración de Variables de Entorno

## Crear archivo .env.local

Crea un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (Optional - for notifications)
RESEND_API_KEY=your_resend_api_key_here
```

## Pasos para configurar Supabase:

1. **Crear proyecto en Supabase:**
   - Ve a https://supabase.com
   - Crea una nueva cuenta o inicia sesión
   - Crea un nuevo proyecto

2. **Obtener credenciales:**
   - Ve a Settings > API en tu proyecto de Supabase
   - Copia la URL del proyecto y la clave anónima
   - Reemplaza los valores en .env.local

3. **Ejecutar migraciones:**
   - Ve a SQL Editor en Supabase
   - Ejecuta el contenido de `supabase/migrations/001_users_and_permissions.sql`
   - Ejecuta el contenido de `supabase/migrations/002_create_super_admin.sql`
   - Ejecuta el contenido de `supabase/migrations/003_update_companies_schema.sql`

4. **Crear bucket para logos:**
   - Ve a Storage en Supabase
   - Crea un nuevo bucket llamado `company-logos`
   - Configura las políticas de acceso según sea necesario

5. **Crear usuario super admin:**
   - Registra un usuario en la aplicación
   - Ejecuta en SQL Editor: `SELECT public.promote_to_super_admin('tu-email@ejemplo.com');`
