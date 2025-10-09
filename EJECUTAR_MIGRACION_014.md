# 🚀 Instrucciones: Ejecutar Migración 014

## ✅ Qué Hace Esta Migración

### **Tablas Nuevas**:
1. ✅ `role_capabilities` - Define qué puede hacer cada rol
2. ✅ `daily_log_templates` - Plantillas configurables para bitácoras (80/20)
3. ✅ `report_configurations` - Configuración de informes por proyecto
4. ✅ `dashboard_widgets` - Widgets personalizados por rol

### **Tablas Mejoradas**:
1. ✅ `companies` - Agrega industry, tax_id_type, company_size, notes
2. ✅ `projects` - Agrega service_type, report_frequency, auto_generate_reports
3. ✅ `daily_logs` - Agrega template_id, sync_status (modo offline)
4. ✅ `reports` - Agrega flujo de estados, versiones, compartir con cliente
5. ✅ `report_signatures` - Agrega orden, tipo (automática/manual)

### **Datos Iniciales**:
- ✅ 25+ capacidades por rol
- ✅ Plantillas base para proyectos existentes
- ✅ Configuraciones de informes por defecto
- ✅ 12 widgets por defecto (2 por rol)

---

## ⚠️ ANTES DE EJECUTAR

### **1. Verificar Acceso**
- [ ] Tienes acceso a Supabase Dashboard
- [ ] Proyecto: `egizwroxfxghgqmtucgk`
- [ ] Puedes acceder al SQL Editor

### **2. Backup Manual** (Recomendado)
1. Ir a Supabase → Database → Backups
2. Crear backup manual
3. Esperar confirmación

### **3. Horario**
- ✅ Ejecutar en horario de bajo uso
- ✅ Tener 15-20 minutos disponibles
- ✅ No tener usuarios activos en el sistema

---

## 📋 PASOS PARA EJECUTAR

### **Paso 1: Abrir SQL Editor**
1. Ir a: https://supabase.com/dashboard
2. Seleccionar proyecto: `egizwroxfxghgqmtucgk`
3. Click en "SQL Editor" (menú lateral)
4. Click en "New Query"

### **Paso 2: Copiar Script**
1. Abrir archivo: `supabase/migrations/014_enhanced_structure.sql`
2. Copiar TODO el contenido (Ctrl+A, Ctrl+C)
3. Pegar en el SQL Editor de Supabase

### **Paso 3: Ejecutar**
1. Click en "Run" (o Ctrl+Enter)
2. **ESPERAR** - Puede tomar 30-60 segundos
3. Ver mensajes en la consola

### **Paso 4: Verificar Resultado**

**Deberías ver**:
```
✅ Migración 014 completada exitosamente
Tablas creadas: role_capabilities, daily_log_templates, report_configurations, dashboard_widgets
Tablas mejoradas: companies, projects, daily_logs, reports, report_signatures
Próximo paso: Ejecutar migración 015 (funciones y triggers)
```

**Si ves errores**:
- ❌ NO CONTINUAR
- ❌ Copiar el error completo
- ❌ Contactar para ayuda

---

## 🧪 TESTING POST-MIGRACIÓN

### **Test 1: Verificar Tablas Creadas**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'role_capabilities',
  'daily_log_templates',
  'report_configurations',
  'dashboard_widgets'
)
ORDER BY table_name;
```

**Resultado esperado**: 4 tablas

### **Test 2: Verificar Capacidades**
```sql
SELECT role, COUNT(*) as capabilities_count
FROM role_capabilities
GROUP BY role
ORDER BY role;
```

**Resultado esperado**:
- super_admin: 6 capacidades
- admin: 7 capacidades
- gerente: 5 capacidades
- supervisor: 7 capacidades
- residente: 4 capacidades
- cliente: 3 capacidades

### **Test 3: Verificar Plantillas**
```sql
SELECT COUNT(*) as templates_count
FROM daily_log_templates;
```

**Resultado esperado**: Al menos 1 plantilla por proyecto existente

### **Test 4: Verificar Widgets**
```sql
SELECT role, COUNT(*) as widgets_count
FROM dashboard_widgets
GROUP BY role
ORDER BY role;
```

**Resultado esperado**: Al menos 2 widgets por rol

### **Test 5: Verificar Columnas Nuevas**
```sql
-- Verificar service_type en projects
SELECT service_type, COUNT(*) 
FROM projects 
GROUP BY service_type;

-- Verificar sync_status en daily_logs
SELECT sync_status, COUNT(*) 
FROM daily_logs 
GROUP BY sync_status;
```

---

## ✅ VERIFICACIÓN DE FUNCIONALIDAD

### **Test 6: Login Sigue Funcionando**
1. Ir a la aplicación
2. Hacer login con tu usuario
3. Verificar que carga el dashboard
4. Verificar que ves los proyectos

**Si falla**: Hay un problema con RLS o permisos

### **Test 7: Proyectos Siguen Visibles**
```sql
SELECT id, name, service_type, report_frequency
FROM projects
LIMIT 5;
```

**Resultado esperado**: Proyectos con valores por defecto

### **Test 8: Roles Intactos**
```sql
SELECT role, COUNT(*) 
FROM profiles 
GROUP BY role;
```

**Resultado esperado**: Tus usuarios con sus roles originales

---

## 🐛 TROUBLESHOOTING

### **Error: "relation already exists"**
**Causa**: La tabla ya existe de una ejecución anterior  
**Solución**: Normal, el script usa `IF NOT EXISTS`

### **Error: "column already exists"**
**Causa**: La columna ya existe  
**Solución**: Normal, el script usa `IF NOT EXISTS`

### **Error: "constraint already exists"**
**Causa**: El constraint ya existe  
**Solución**: Normal, el script hace `DROP IF EXISTS` primero

### **Error: "permission denied"**
**Causa**: No tienes permisos de admin en Supabase  
**Solución**: Verificar que estás usando el usuario correcto

### **Error: "syntax error"**
**Causa**: El script se copió mal  
**Solución**: Copiar de nuevo, asegurar que está completo

---

## 🔄 ROLLBACK (Si algo sale mal)

### **Opción A: Restaurar desde Backup**
```sql
-- Ver backups disponibles
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'backup_migration_014'
ORDER BY table_name;

-- Restaurar una tabla específica (ejemplo)
BEGIN;
DROP TABLE IF EXISTS projects CASCADE;
CREATE TABLE projects AS 
  SELECT * FROM backup_migration_014.projects_backup_YYYYMMDD_HHMMSS;
COMMIT;
```

### **Opción B: Rollback Completo**
```sql
BEGIN;

-- Eliminar tablas nuevas
DROP TABLE IF EXISTS dashboard_widgets CASCADE;
DROP TABLE IF EXISTS report_configurations CASCADE;
DROP TABLE IF EXISTS daily_log_templates CASCADE;
DROP TABLE IF EXISTS role_capabilities CASCADE;

-- Restaurar tablas modificadas desde backup
-- (ver Opción A para cada tabla)

COMMIT;
```

---

## 📊 MÉTRICAS DE ÉXITO

Después de ejecutar, deberías tener:

- ✅ 4 tablas nuevas creadas
- ✅ 5 tablas mejoradas con nuevas columnas
- ✅ 32+ capacidades de rol definidas
- ✅ Plantillas base para todos los proyectos
- ✅ Configuraciones de informes por defecto
- ✅ 12+ widgets de dashboard
- ✅ Login funcionando
- ✅ Proyectos visibles
- ✅ Sin errores en consola

---

## 🚀 PRÓXIMOS PASOS

Una vez que esta migración esté OK:

1. ✅ Commit y push del código
2. ✅ Documentar en CHANGELOG
3. ⏭️ Preparar migración 015 (funciones y triggers)
4. ⏭️ Preparar migración 016 (políticas RLS)

---

## 📞 AYUDA

Si algo sale mal:
1. NO PÁNICO
2. Copiar el error completo
3. Verificar en qué paso falló
4. Contactar con el error y el paso

**Recuerda**: Tenemos backups automáticos y manuales. Nada se pierde permanentemente.

---

**¿Listo para ejecutar?** 🚀
