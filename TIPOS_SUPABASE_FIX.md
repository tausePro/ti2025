# 🔧 Fix de Tipos de Supabase

## Problema

Después de actualizar `@supabase/ssr` de 0.4.0 a 0.7.0 para resolver vulnerabilidades de seguridad, los tipos de Supabase no se infieren correctamente en los queries.

## Causa

La nueva versión de `@supabase/ssr` cambió la forma en que maneja los tipos. Ahora requiere tipos explícitos de la base de datos.

## Solución Implementada

### 1. Creado archivo de tipos
- `types/database.types.ts` - Tipos manuales de todas las tablas

### 2. Actualizado imports
- `lib/supabase/client.ts` - Usa `Database` types
- `lib/supabase/server.ts` - Usa `Database` types  
- `lib/supabase.ts` - Usa `Database` types

### 3. Problema Pendiente

Los queries de Supabase aún no infieren tipos correctamente. Ejemplo:

```typescript
const { data: userData } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// userData es tipo 'never' en lugar de Profile
```

## Soluciones Posibles

### Opción A: Type Assertions (Rápido pero no ideal)
```typescript
const { data: userData } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single() as { data: Database['public']['Tables']['profiles']['Row'] | null }
```

### Opción B: Generar tipos desde Supabase CLI (Ideal)
```bash
npx supabase login
npx supabase gen types typescript --project-id egizwroxfxghgqmtucgk > types/supabase.ts
```

### Opción C: Usar helper functions
```typescript
// Crear helpers tipados
export const getProfile = async (id: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  
  return data as Database['public']['Tables']['profiles']['Row'] | null
}
```

## Archivos Afectados (120 errores)

Los errores están principalmente en:
- `app/(dashboard)/admin/users/[id]/edit/page.tsx`
- `app/(dashboard)/admin/users/[id]/permissions/page.tsx`
- `app/(dashboard)/admin/config/page.tsx`
- Y otros archivos que hacen queries a Supabase

## Recomendación

**Para deploy inmediato**: Usar Opción A (type assertions) en archivos críticos

**Para solución permanente**: Implementar Opción B (generar tipos desde CLI) + Opción C (helper functions)

## Estado Actual

- ✅ Vulnerabilidades resueltas (12 → 0)
- ✅ Tipos base creados
- ⚠️ Queries necesitan type assertions
- ❌ Build falla por errores de tipos

## Próximos Pasos

1. Agregar type assertions a queries críticos
2. Generar tipos oficiales desde Supabase CLI
3. Crear helper functions tipadas
4. Actualizar toda la codebase gradualmente
