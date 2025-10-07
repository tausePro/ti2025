/**
 * Sistema de Logging Estructurado
 * Reemplaza console.log/error con logging estructurado y contextual
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogContext {
  [key: string]: any
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isClient = typeof window !== 'undefined'

  /**
   * Formatea el timestamp en formato ISO
   */
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * Crea una entrada de log estructurada
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: this.getTimestamp(),
      level,
      message,
      context,
      error,
    }
  }

  /**
   * Envía el log a la consola con formato
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, context, error } = entry

    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    const contextStr = context ? `\n${JSON.stringify(context, null, 2)}` : ''
    const errorStr = error ? `\n${error.stack || error.message}` : ''

    const fullMessage = `${prefix} ${message}${contextStr}${errorStr}`

    switch (level) {
      case 'debug':
        if (this.isDevelopment) console.debug(fullMessage)
        break
      case 'info':
        console.info(fullMessage)
        break
      case 'warn':
        console.warn(fullMessage)
        break
      case 'error':
      case 'fatal':
        console.error(fullMessage)
        break
    }
  }

  /**
   * Envía el log a un servicio externo (Sentry, LogRocket, etc.)
   * TODO: Implementar integración con servicio de monitoreo
   */
  private async logToService(entry: LogEntry): Promise<void> {
    // Solo en producción y para errores críticos
    if (!this.isDevelopment && (entry.level === 'error' || entry.level === 'fatal')) {
      // TODO: Integrar con Sentry o similar
      // await sendToSentry(entry)
    }
  }

  /**
   * Método principal de logging
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const entry = this.createLogEntry(level, message, context, error)
    
    this.logToConsole(entry)
    
    // Enviar a servicio externo de forma asíncrona
    if (!this.isDevelopment) {
      this.logToService(entry).catch(console.error)
    }
  }

  /**
   * Log de debug (solo en desarrollo)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  /**
   * Log informativo
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  /**
   * Log de advertencia
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  /**
   * Log de error
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error)
  }

  /**
   * Log de error fatal (crítico)
   */
  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log('fatal', message, context, error)
  }

  /**
   * Log de operación de base de datos
   */
  database(operation: string, table: string, context?: LogContext, error?: Error): void {
    const message = `Database ${operation}: ${table}`
    const dbContext = {
      ...context,
      operation,
      table,
      type: 'database',
    }
    
    if (error) {
      this.error(message, dbContext, error)
    } else {
      this.debug(message, dbContext)
    }
  }

  /**
   * Log de autenticación
   */
  auth(action: string, context?: LogContext, error?: Error): void {
    const message = `Auth: ${action}`
    const authContext = {
      ...context,
      action,
      type: 'auth',
    }
    
    if (error) {
      this.error(message, authContext, error)
    } else {
      this.info(message, authContext)
    }
  }

  /**
   * Log de API
   */
  api(method: string, endpoint: string, context?: LogContext, error?: Error): void {
    const message = `API ${method}: ${endpoint}`
    const apiContext = {
      ...context,
      method,
      endpoint,
      type: 'api',
    }
    
    if (error) {
      this.error(message, apiContext, error)
    } else {
      this.debug(message, apiContext)
    }
  }

  /**
   * Log de performance
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const message = `Performance: ${operation} took ${duration}ms`
    const perfContext = {
      ...context,
      operation,
      duration,
      type: 'performance',
    }
    
    if (duration > 1000) {
      this.warn(message, perfContext)
    } else {
      this.debug(message, perfContext)
    }
  }

  /**
   * Wrapper para medir performance de funciones
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      this.performance(operation, duration, context)
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.error(`${operation} failed after ${duration}ms`, context, error as Error)
      throw error
    }
  }

  /**
   * Wrapper para medir performance de funciones síncronas
   */
  measure<T>(
    operation: string,
    fn: () => T,
    context?: LogContext
  ): T {
    const start = Date.now()
    try {
      const result = fn()
      const duration = Date.now() - start
      this.performance(operation, duration, context)
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.error(`${operation} failed after ${duration}ms`, context, error as Error)
      throw error
    }
  }
}

// Exportar instancia singleton
export const logger = new Logger()

// Exportar tipos para uso en otros archivos
export type { LogLevel, LogContext, LogEntry }
