# Plan de ejecución — Control de Calidad (feedback de Santiago Gil)

Documento de seguimiento del feedback de supervisión. Se actualiza en cada release.

## Estado general

| # | Punto | Estado | Release | Migración | Validado por Santi |
|---|-------|--------|---------|-----------|--------------------|
| 1 | Resistencias de concreto en MPa (17.5–49) | ✅ En producción | v0.0.14 | 095 | Pendiente |
| 2 | Edad de 56 días opcional + veredicto por edad decisiva | ✅ En producción | v0.0.14 | 096 | Pendiente |
| 3 | Fix 404 al editar muestras (con reprogramación de ensayos) | ✅ En producción | v0.0.14 | — | Pendiente |
| 4 | Unidades visibles en captura y detalle | ✅ En producción | v0.0.14 | — | Pendiente |
| 5 | Acero NTC-2289: físico (fluencia 420–540, tracción ≥550, fu/fy ≥1.25, alargamiento 14/12% según diámetro) | ✅ En producción | v0.0.15 | 097 | Pendiente |
| 6 | Acero: análisis químico de colada (máx. C 0.33, Mn 1.56, P 0.043, S 0.053, Si 0.55 %) | ✅ En producción | v0.0.15 | 097 | Pendiente |
| 7 | Mallas electrosoldadas NTC-5806 (fluencia ≥485, tracción ≥550) | ✅ En producción | v0.0.15 | 097 | Pendiente |
| 8 | PDF del informe de control de calidad | ✅ En producción | v0.0.16 | — | Pendiente |
| 9 | Ola 1 formatos: morteros, muretes, unidades de mampostería (absorción ≤ NTC-4205) | ✅ En producción | v0.0.17 | 098 | Pendiente |
| 10 | Veredicto concreto: ¿promedio o por probeta individual? | ❓ Decisión de Santi | — | — | — |
| 11 | Ola 2 formatos: presurización agua/gas y estanqueidad (lecturas pareadas + fotos) | ⏳ Pendiente | — | — | — |
| 12 | UI admin de plantillas de calidad (sin migraciones) | ⏳ Pendiente | — | — | — |
| 13 | Ola 3 formatos: asentamientos (serie temporal) y avance de pilas (volumen teórico vs real) | ⏳ Pendiente | — | — | — |

## Decisiones técnicas

- **Motor de métricas** (`lib/quality-control/metrics.ts`): criterios por operador (`>=`, `<=`, rango), condicionados por campos de la muestra (`when`), métricas calculadas (`ratio:a/b`). Reutilizable para absorción (≤) y presurizaciones.
- **Acero evalúa por probeta individual** (exigencia de norma); concreto sigue por promedio hasta decisión de Santi (punto 10).
- **Veredicto por edad decisiva** (migración 096): manda el ensayo completado de mayor edad con resultados.
- **Ensayos nombrados** (`test_configuration.named_tests`): reemplazan a `test_periods` cuando existen; el código soporta ambos formatos.
- **Criterios por especificación del proyecto** (`value_from`): las unidades de mampostería no usan límites fijos de norma; el residente ingresa resistencia mínima y absorción máxima de la especificación al crear la muestra y el motor evalúa contra esos valores.
- **Mortero de pega**: 75% de f'cp a 7 días y 100% a 28 días — el 75% es supuesto razonable pendiente de confirmación de Santi (pregunta abierta 2).

## Registro de validaciones

| Fecha | Qué se validó | Quién | Resultado |
|-------|---------------|-------|-----------|
| 2026-08-24 | Migraciones 095, 096, 097 aplicadas en Supabase | Felipe | OK — verificación SQL correcta |
| 2026-08-28 | Migración 098 aplicada: 3 plantillas de Ola 1 creadas | Felipe | OK — verificación SQL correcta |
| — | Flujo de acero en producción (crear muestra, físico, químico, malla) | Santi/Felipe | Pendiente |
| — | Concreto: 56 días y veredicto por edad decisiva con muestra real | Santi | Pendiente |

## Preguntas abiertas para Santi

1. Concreto: ¿el veredicto debe ser por promedio de cilindros (actual) o cada cilindro individual?
2. Ola 1: criterios reales de morteros y muretes (¿qué resistencias y edades?).
3. Presurizaciones: formato de lecturas (inicial/final, duración) y evidencia fotográfica requerida.
