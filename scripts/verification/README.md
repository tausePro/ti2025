# 🔍 Scripts de Verificación

Esta carpeta contiene scripts de verificación y diagnóstico del sistema.

## 📋 Scripts Disponibles

### **check-auth-status.js**
Verifica el estado de autenticación y perfiles de usuario.

```bash
node scripts/verification/check-auth-status.js
```

### **check-database-status.js**
Verifica el estado de la base de datos y tablas.

```bash
node scripts/verification/check-database-status.js
```

### **check-tables-simple.js**
Verificación simple de tablas existentes.

```bash
node scripts/verification/check-tables-simple.js
```

### **debug-browser-auth.js**
Debug de autenticación en el navegador.

```bash
node scripts/verification/debug-browser-auth.js
```

### **debug-form.js**
Debug de formularios y validaciones.

```bash
node scripts/verification/debug-form.js
```

### **setup-storage-service-role.js**
Configura políticas de storage con service role.

```bash
node scripts/verification/setup-storage-service-role.js
```

### **verify-fiduciary-system.js**
Verifica la implementación del sistema fiduciario.

```bash
node scripts/verification/verify-fiduciary-system.js
```

---

## ⚙️ Configuración

Asegúrate de tener las variables de entorno configuradas en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

---

## 📝 Notas

- Estos scripts son para desarrollo y diagnóstico
- No ejecutar en producción sin supervisión
- Algunos scripts requieren permisos de administrador

---

**Última actualización: Octubre 2025**
