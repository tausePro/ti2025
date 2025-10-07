# 📋 Sistema Fiduciario - Migraciones

## ✅ Migraciones Oficiales a Usar

### **007_fiduciary_system_working.sql** ⭐
**Esta es la migración oficial del sistema fiduciario.**

**Incluye:**
- Tabla `fiduciary_accounts` - Cuentas SIFI 1 y 2
- Tabla `payment_orders` - Órdenes de pago
- Tabla `fiduciary_movements` - Movimientos fiduciarios
- Tabla `financial_configurations` - Configuración financiera
- Políticas RLS básicas
- Triggers y funciones necesarias

### **008_fix_fiduciary_system.sql** ⭐
**Correcciones y mejoras de RLS para el sistema fiduciario.**

**Incluye:**
- Políticas RLS mejoradas
- Corrección de permisos
- Validaciones adicionales

---

## ⚠️ Archivos Históricos (NO USAR)

Los siguientes archivos son versiones anteriores y **NO deben ejecutarse**:

- ❌ `007_fiduciary_system.sql` - Primera versión (deprecada)
- ❌ `007_fiduciary_system_final.sql` - Versión intermedia (deprecada)
- ❌ `007_fiduciary_system_fixed.sql` - Versión intermedia (deprecada)
- ❌ `007_fiduciary_system_simple.sql` - Versión simplificada (deprecada)

**Estos archivos se mantienen solo como referencia histórica.**

---

## 📝 Orden de Ejecución

Para implementar el sistema fiduciario correctamente:

1. **Ejecutar migraciones base** (001 a 006)
2. **Ejecutar**: `007_fiduciary_system_working.sql`
3. **Ejecutar**: `008_fix_fiduciary_system.sql`
4. **Continuar con**: migraciones 009 en adelante

---

## 🔍 Verificación

Después de ejecutar las migraciones, verifica:

```sql
-- Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'fiduciary_accounts',
  'payment_orders',
  'fiduciary_movements',
  'financial_configurations'
);

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN (
  'fiduciary_accounts',
  'payment_orders',
  'fiduciary_movements',
  'financial_configurations'
);
```

---

## 📊 Estructura del Sistema Fiduciario

### Tablas Principales

#### **fiduciary_accounts**
Gestión de cuentas fiduciarias SIFI 1 y 2
- `id`, `project_id`, `account_type`
- `account_number`, `bank_name`
- `balance`, `currency`

#### **payment_orders**
Órdenes de pago del proyecto
- `id`, `project_id`, `fiduciary_account_id`
- `order_number`, `amount`, `status`
- `beneficiary`, `concept`

#### **fiduciary_movements**
Movimientos de las cuentas fiduciarias
- `id`, `fiduciary_account_id`, `payment_order_id`
- `movement_type`, `amount`
- `balance_after`, `description`

#### **financial_configurations**
Configuración financiera del proyecto
- `id`, `project_id`
- `uses_acts`, `uses_legalizations`
- `requires_fiduciary_approval`

---

## 🚀 Uso en la Aplicación

### Hook: `useFiduciary`
```typescript
import { useFiduciary } from '@/hooks/useFiduciary'

const { 
  accounts, 
  createAccount, 
  updateAccount 
} = useFiduciary(projectId)
```

### Componente: `FiduciaryInfoForm`
```typescript
import { FiduciaryInfoForm } from '@/components/projects/FiduciaryInfoForm'

<FiduciaryInfoForm 
  projectId={projectId}
  onSave={handleSave}
/>
```

---

**Última actualización: Octubre 2025**
