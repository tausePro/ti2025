# 📦 Historial de Fixes SQL

Esta carpeta contiene scripts SQL históricos de correcciones y diagnósticos.

## ⚠️ IMPORTANTE

**Estos archivos son SOLO para referencia histórica.**

**NO ejecutar estos scripts** a menos que sepas exactamente qué hacen y por qué son necesarios.

---

## 📋 Contenido

### **Scripts de Fix RLS**
- `FIX_RLS_COMPLETE.sql`
- `FIX_RLS_NO_RECURSION.sql`
- `URGENTE_FIX_RLS.sql`
- `fix-rls-recursion.sql`
- `FIX_PERFORMANCE_METRICS_RLS.sql`

### **Scripts de Creación de Usuarios**
- `CREATE_ADMIN_USER_COMPLETE.sql`
- `CREATE_SUPER_ADMIN_FUNCTION.sql`
- `CREATE_PROFILES_TABLE.sql`
- `create-super-admin.sql`
- `create-test-user.sql`

### **Scripts de Migración**
- `MIGRATE_USERS_TO_PROFILES.sql`
- `EXECUTE_MIGRATION_011.sql`
- `EXECUTE_MIGRATION_MANUAL.sql`

### **Scripts de Diagnóstico**
- `DIAGNOSTIC_AND_FIX.sql`
- `CHECK_ADMIN_USER.sql`
- `CHECK_USER_ROLE.sql`

### **Scripts de Limpieza**
- `CLEAN_DATABASE.sql`
- `TEMPORAL_DISABLE_RLS.sql`

### **Scripts de Corrección**
- `FIX_DEV_PROFILE.sql`
- `FIX_PROFILES_DUPLICATE.sql`
- `FIX_USER_ROLE.sql`
- `fix-storage-policies.sql`

### **Scripts de Base de Datos**
- `database-schema.sql`
- `database-updates.sql`

### **Otros**
- `ADD_CREATED_BY_COLUMN.sql`

---

## ✅ Migraciones Oficiales

Para implementar el sistema correctamente, usa las migraciones en:

```
supabase/migrations/
```

En orden numérico:
1. `001_users_and_permissions.sql`
2. `002_create_super_admin.sql`
3. `003_update_companies_schema.sql`
4. ... y así sucesivamente

---

## 🔍 ¿Por qué están aquí?

Estos scripts se generaron durante el desarrollo para:
- Corregir problemas de RLS
- Diagnosticar errores
- Migrar datos
- Limpiar base de datos de desarrollo

Se mantienen como referencia histórica para entender la evolución del proyecto.

---

## 📞 Soporte

Si necesitas ejecutar alguno de estos scripts:
1. Consulta primero con el equipo de desarrollo
2. Revisa las migraciones oficiales
3. Verifica que el problema no esté ya resuelto

---

**Última actualización: Octubre 2025**
