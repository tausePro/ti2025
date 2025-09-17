# Configuración de Variables de Entorno para Vercel

## Variables necesarias:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Obtén esta URL de tu proyecto de Supabase
   - Formato: `https://tu-proyecto.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Obtén esta clave de tu proyecto de Supabase
   - Se encuentra en Settings > API > Project API keys

## Cómo configurar en Vercel:

```bash
# Configurar URL de Supabase
npx vercel env add NEXT_PUBLIC_SUPABASE_URL

# Configurar clave anónima de Supabase
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Después de configurar las variables:

```bash
# Redesplegar
npx vercel --prod
```
