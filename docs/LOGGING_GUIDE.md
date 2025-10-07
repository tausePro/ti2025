# 📝 Guía de Logging Estructurado

## 🎯 Objetivo

Reemplazar `console.log`, `console.error` y `console.warn` con un sistema de logging estructurado que:
- Proporciona contexto rico
- Facilita debugging
- Permite integración con servicios de monitoreo (Sentry, LogRocket, etc.)
- Mejora la trazabilidad en producción

---

## 📦 Importación

```typescript
import { logger } from '@/lib/logger'
```

---

## 🔧 Métodos Disponibles

### 1. **Debug** (solo en desarrollo)
```typescript
logger.debug('Mensaje de debug', { 
  userId: '123',
  action: 'click'
})
```

### 2. **Info** (informativo)
```typescript
logger.info('Usuario autenticado correctamente', {
  userId: user.id,
  email: user.email
})
```

### 3. **Warn** (advertencia)
```typescript
logger.warn('Operación lenta detectada', {
  operation: 'loadProjects',
  duration: 2500
})
```

### 4. **Error** (error)
```typescript
logger.error('Error al cargar proyectos', {
  filters: { status: 'active' },
  page: 1
}, error)
```

### 5. **Fatal** (error crítico)
```typescript
logger.fatal('Error crítico del sistema', {
  component: 'AuthProvider',
  action: 'initialize'
}, error)
```

---

## 🎯 Métodos Especializados

### **Database Operations**
```typescript
// Éxito
logger.database('SELECT', 'projects', {
  filters: { status: 'active' },
  count: 10
})

// Error
logger.database('INSERT', 'projects', {
  projectData: { name: 'Nuevo Proyecto' }
}, error)
```

### **Authentication**
```typescript
// Login exitoso
logger.auth('login', {
  userId: user.id,
  method: 'email'
})

// Error de autenticación
logger.auth('login_failed', {
  email: 'user@example.com',
  reason: 'invalid_credentials'
}, error)
```

### **API Calls**
```typescript
// Request exitoso
logger.api('POST', '/api/projects', {
  status: 200,
  duration: 150
})

// Request fallido
logger.api('POST', '/api/projects', {
  status: 500,
  body: requestBody
}, error)
```

### **Performance Monitoring**
```typescript
logger.performance('loadProjects', 1250, {
  filters: { status: 'active' },
  count: 50
})
```

---

## ⏱️ Medición de Performance

### **Funciones Asíncronas**
```typescript
const projects = await logger.measureAsync(
  'loadProjects',
  async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
    return data
  },
  { filters: { status: 'active' } }
)
```

### **Funciones Síncronas**
```typescript
const result = logger.measure(
  'processData',
  () => {
    // Procesamiento pesado
    return processedData
  },
  { itemCount: 1000 }
)
```

---

## 🔄 Migración de console.error

### ❌ Antes (NO USAR)
```typescript
try {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
  
  if (error) throw error
} catch (err) {
  console.error('Error loading projects:', err)
}
```

### ✅ Después (USAR)
```typescript
try {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
  
  if (error) throw error
} catch (err) {
  logger.database('SELECT', 'projects', {
    filters: appliedFilters,
    page: currentPage
  }, err as Error)
}
```

---

## 📊 Ejemplos por Contexto

### **Hook de React**
```typescript
import { logger } from '@/lib/logger'

export function useProjects() {
  const loadProjects = async () => {
    try {
      logger.debug('Iniciando carga de proyectos', { filters })
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
      
      if (error) throw error
      
      logger.info('Proyectos cargados exitosamente', {
        count: data.length
      })
      
      return data
    } catch (err) {
      logger.database('SELECT', 'projects', { filters }, err as Error)
      throw err
    }
  }
}
```

### **API Route**
```typescript
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    logger.api('POST', '/api/projects', {
      body: body
    })
    
    // Lógica de la API
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.api('POST', '/api/projects', {
      body: body,
      error: 'Processing failed'
    }, error as Error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### **Componente de React**
```typescript
import { logger } from '@/lib/logger'

export function ProjectForm() {
  const handleSubmit = async (data: ProjectData) => {
    try {
      logger.info('Enviando formulario de proyecto', {
        projectName: data.name
      })
      
      const result = await createProject(data)
      
      logger.info('Proyecto creado exitosamente', {
        projectId: result.id
      })
    } catch (error) {
      logger.error('Error al crear proyecto', {
        formData: data
      }, error as Error)
    }
  }
}
```

### **Context Provider**
```typescript
import { logger } from '@/lib/logger'

export function AuthProvider({ children }) {
  useEffect(() => {
    const initAuth = async () => {
      try {
        logger.debug('Inicializando autenticación')
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          logger.auth('session_restored', {
            userId: session.user.id
          })
        }
      } catch (error) {
        logger.auth('init_failed', {}, error as Error)
      }
    }
    
    initAuth()
  }, [])
}
```

---

## 🚀 Integración con Servicios Externos

### **Sentry (Próximamente)**
```typescript
// En lib/logger.ts
private async logToService(entry: LogEntry): Promise<void> {
  if (!this.isDevelopment && (entry.level === 'error' || entry.level === 'fatal')) {
    // Sentry.captureException(entry.error, {
    //   level: entry.level,
    //   extra: entry.context
    // })
  }
}
```

### **LogRocket (Próximamente)**
```typescript
// LogRocket.log(entry.level, entry.message, entry.context)
```

---

## 📋 Checklist de Migración

- [ ] Reemplazar `console.log` con `logger.debug` o `logger.info`
- [ ] Reemplazar `console.error` con `logger.error`
- [ ] Reemplazar `console.warn` con `logger.warn`
- [ ] Agregar contexto relevante a cada log
- [ ] Usar métodos especializados cuando aplique
- [ ] Medir performance de operaciones críticas

---

## 🎯 Buenas Prácticas

### ✅ DO
- Incluir contexto relevante (IDs, filtros, parámetros)
- Usar métodos especializados (database, auth, api)
- Medir performance de operaciones lentas
- Loggear errores con el objeto Error completo

### ❌ DON'T
- No loggear información sensible (passwords, tokens)
- No usar console.* directamente
- No loggear en exceso (spam de logs)
- No loggear objetos circulares

---

## 📊 Formato de Salida

### Desarrollo
```
[2025-10-06T21:05:51.123Z] [ERROR] Database SELECT: projects
{
  "filters": { "status": "active" },
  "page": 1,
  "pageSize": 20
}
Error: Connection timeout
    at loadProjects (useProjects.ts:107)
```

### Producción
Los logs se envían a servicios de monitoreo configurados.

---

**Última actualización: Octubre 2025**
