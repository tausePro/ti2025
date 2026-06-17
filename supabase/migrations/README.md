# Migraciones - Guía de Orden Canónico

**Última actualización**: Junio 2026

Las migraciones se ejecutan en orden numérico (001 → 090), con las excepciones documentadas abajo.

## Números con múltiples archivos

### 007 - Sistema Fiduciario (5 archivos)

Solo ejecutar **`007_fiduciary_system_working.sql`**. Las otras 4 versiones (`007_fiduciary_system.sql`, `_final`, `_fixed`, `_simple`) son históricas y NO deben ejecutarse. Ver detalle en `README_FIDUCIARY.md`.

### 048 - Colisión de numeración (2 archivos distintos)

- `048_daily_log_configs.sql` - configuración de bitácoras (reemplazada por `049_create_daily_log_configs.sql`)
- `048_daily_logs_improvements.sql` - mejoras a bitácoras diarias

Ambas son migraciones distintas que comparten número. En caso de setup desde cero: ejecutar `048_daily_logs_improvements.sql` y luego `049_create_daily_log_configs.sql` (que crea `daily_log_configs` de forma idempotente).

### 072 - Colisión de numeración (2 archivos distintos)

- `072_ai_settings.sql` - configuración de IA
- `072_project_report_templates.sql` - plantillas de informe por proyecto

Ambas son válidas y deben ejecutarse (en cualquier orden entre sí, antes de 073).

## Números sin archivo

032, 034 y 039 no existen (fueron descartadas durante el desarrollo). El salto es esperado.

## Reglas para nuevas migraciones

- Numeración secuencial estricta a partir de 091.
- Nunca reutilizar un número existente.
- Migraciones no destructivas: la BD de producción tiene datos reales de cliente.
- Ante duda sobre datos reales, validar antes con consultas SQL de inspección (ver regla en `docs-private/`).
- Si una migración requiere rollback, dejar el script en `supabase/fixes-history/`.
