import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { formatDateValue } from '@/lib/utils'
import {
  findNamedTest,
  type NamedTestDefinition,
} from '@/lib/quality-control/metrics'

const LETTER_W = 612
const LETTER_H = 792

const s = StyleSheet.create({
  page: {
    width: LETTER_W,
    height: LETTER_H,
    position: 'relative',
    paddingTop: 95,
    paddingBottom: 100,
    paddingHorizontal: 56,
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: LETTER_W,
    height: LETTER_H,
  },
  body: {
    flex: 1,
  },
  docType: {
    fontSize: 8,
    letterSpacing: 2.5,
    color: '#689F38',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#8BC34A',
    paddingBottom: 5,
  },
  docSubtitle: {
    fontSize: 10.5,
    color: '#444',
    marginBottom: 2,
  },
  docHeader: {
    marginBottom: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  infoItem: {
    width: '50%',
    paddingVertical: 3,
    paddingRight: 10,
  },
  infoItemThird: {
    width: '33.33%',
    paddingVertical: 3,
    paddingRight: 10,
  },
  infoLabel: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888',
    fontWeight: 'medium',
  },
  infoValue: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#4a7c10',
    borderLeftWidth: 3,
    borderLeftColor: '#8BC34A',
    paddingLeft: 7,
    marginBottom: 5,
    marginTop: 10,
  },
  sectionContent: {
    fontSize: 10,
    lineHeight: 1.55,
    color: '#333',
    textAlign: 'justify',
    marginBottom: 8,
  },
  testCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 3,
    marginBottom: 8,
  },
  testHeader: {
    backgroundColor: '#f5f5f5',
    padding: '4 8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testHeaderTitle: {
    fontWeight: 'bold',
    fontSize: 9,
    color: '#333',
  },
  testHeaderDate: {
    fontSize: 8,
    color: '#666',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '3 8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
    fontSize: 9,
  },
  resultDesc: {
    flex: 1,
    color: '#333',
    fontSize: 9,
  },
  metricLine: {
    fontSize: 8.5,
    color: '#444',
    lineHeight: 1.4,
  },
  statusOk: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    padding: '1 5',
    borderRadius: 2,
  },
  statusFail: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#c62828',
    backgroundColor: '#ffebee',
    padding: '1 5',
    borderRadius: 2,
  },
  statusNeutral: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: '1 5',
    borderRadius: 2,
  },
  verdictBox: {
    borderWidth: 1,
    borderRadius: 3,
    padding: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verdictLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: 'bold',
  },
  verdictValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
})

interface TemplateCustomField {
  name: string
  label: string
  unit?: string
}

interface QualityResult {
  specimen_number: number
  result_value: number
  result_data?: { metrics?: Record<string, number> } | null
  meets_criteria: boolean | null
  deviation_percentage: number | null
  notes: string | null
}

interface QualityTestRow {
  id: string
  test_name: string
  test_period: number
  test_date: string
  actual_test_date: string | null
  status: string
  test_config: { named_test_key?: string; optional?: boolean } | null
  results: QualityResult[]
}

interface QualityReportPdfProps {
  sample: {
    sample_number: string
    sample_code: string
    sample_date: string
    location: string | null
    status: string
    overall_result: string | null
    notes: string | null
    custom_data: Record<string, unknown> | null
  }
  project: {
    name: string
    project_code: string
    address: string | null
    city: string | null
  } | null
  template: {
    template_name: string
    custom_fields: TemplateCustomField[]
    test_configuration?: {
      units?: string
      specimens_label?: string
      named_tests?: NamedTestDefinition[]
    } | null
  } | null
  tests: QualityTestRow[]
  membreteSrc: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Proceso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  failed: 'Fallido',
  approved: 'Aprobado',
}

function getVerdict(overallResult: string | null): {
  label: string
  color: string
  background: string
  border: string
} {
  switch (overallResult) {
    case 'approved':
    case 'CUMPLE':
      return { label: 'CUMPLE', color: '#2e7d32', background: '#e8f5e9', border: '#a5d6a7' }
    case 'rejected':
    case 'NO CUMPLE':
      return { label: 'NO CUMPLE', color: '#c62828', background: '#ffebee', border: '#ef9a9a' }
    case 'conditional':
      return { label: 'CONDICIONAL', color: '#f9a825', background: '#fffde7', border: '#fff59f' }
    default:
      return { label: 'PENDIENTE', color: '#666', background: '#f5f5f5', border: '#ddd' }
  }
}

export function QualityReportPdf({
  sample,
  project,
  template,
  tests,
  membreteSrc,
}: QualityReportPdfProps) {
  const units = template?.test_configuration?.units || ''
  const verdict = getVerdict(sample.overall_result)

  const customFields = (template?.custom_fields || []).filter(
    field =>
      sample.custom_data?.[field.name] !== undefined &&
      sample.custom_data?.[field.name] !== null &&
      String(sample.custom_data?.[field.name]).trim() !== ''
  )

  return (
    <Document
      title={`Informe de Control de Calidad - ${sample.sample_code}`}
      author="Talento Inmobiliario"
      creator="TausePro"
    >
      <Page size="LETTER" style={s.page}>
        {membreteSrc ? (
          <View style={s.bg} fixed>
            <Image src={membreteSrc} style={{ width: LETTER_W, height: LETTER_H }} />
          </View>
        ) : null}

        <View style={s.body}>
          {/* Encabezado */}
          <View style={s.docHeader}>
            <Text style={s.docType}>Control de Calidad</Text>
            <Text style={s.docTitle}>Informe de Ensayos</Text>
            <Text style={s.docSubtitle}>
              <Text style={{ fontWeight: 'bold' }}>Proyecto: </Text>
              {project?.project_code || ''} - {project?.name || ''}
            </Text>
            <Text style={s.docSubtitle}>
              <Text style={{ fontWeight: 'bold' }}>Tipo de control: </Text>
              {template?.template_name || ''}
            </Text>
          </View>

          {/* Información de la muestra */}
          <Text style={s.sectionTitle}>Información de la Muestra</Text>
          <View style={s.infoGrid}>
            <View style={s.infoItemThird}>
              <Text style={s.infoLabel}>Número de Muestra</Text>
              <Text style={s.infoValue}>{sample.sample_number}</Text>
            </View>
            <View style={s.infoItemThird}>
              <Text style={s.infoLabel}>Código</Text>
              <Text style={s.infoValue}>{sample.sample_code}</Text>
            </View>
            <View style={s.infoItemThird}>
              <Text style={s.infoLabel}>Fecha de Toma</Text>
              <Text style={s.infoValue}>
                {formatDateValue(sample.sample_date, 'es-CO')}
              </Text>
            </View>
            {sample.location ? (
              <View style={s.infoItemThird}>
                <Text style={s.infoLabel}>Ubicación</Text>
                <Text style={s.infoValue}>{sample.location}</Text>
              </View>
            ) : null}
            <View style={s.infoItemThird}>
              <Text style={s.infoLabel}>Estado</Text>
              <Text style={s.infoValue}>
                {STATUS_LABELS[sample.status] || sample.status}
              </Text>
            </View>
            {project?.city ? (
              <View style={s.infoItemThird}>
                <Text style={s.infoLabel}>Ciudad</Text>
                <Text style={s.infoValue}>{project.city}</Text>
              </View>
            ) : null}
          </View>

          {/* Datos del control */}
          {customFields.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Datos del Control</Text>
              <View style={s.infoGrid}>
                {customFields.map(field => (
                  <View key={field.name} style={s.infoItemThird}>
                    <Text style={s.infoLabel}>{field.label}</Text>
                    <Text style={s.infoValue}>
                      {String(sample.custom_data?.[field.name])}
                      {field.unit ? ` ${field.unit}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Ensayos */}
          <Text style={s.sectionTitle}>Resultados de Ensayos</Text>
          {tests.length === 0 ? (
            <Text style={s.sectionContent}>No hay ensayos programados.</Text>
          ) : (
            tests.map(test => {
              const namedTest = findNamedTest(
                template?.test_configuration,
                test.test_config?.named_test_key
              )
              const specimensLabel =
                namedTest?.specimens_label ||
                template?.test_configuration?.specimens_label ||
                'Cilindro'
              const title =
                test.test_period > 0
                  ? `${test.test_name} — ${test.test_period} días`
                  : test.test_name

              return (
                <View key={test.id} style={s.testCard} wrap={false}>
                  <View style={s.testHeader}>
                    <Text style={s.testHeaderTitle}>
                      {title}
                      {test.test_config?.optional ? ' (opcional)' : ''}
                    </Text>
                    <Text style={s.testHeaderDate}>
                      {test.actual_test_date
                        ? `Ensayado: ${formatDateValue(test.actual_test_date, 'es-CO')}`
                        : `Programado: ${formatDateValue(test.test_date, 'es-CO')}`}
                    </Text>
                  </View>

                  {test.results.length === 0 ? (
                    <View style={s.resultRow}>
                      <Text style={s.resultDesc}>
                        Sin resultados registrados ({STATUS_LABELS[test.status] || test.status})
                      </Text>
                    </View>
                  ) : (
                    test.results.map(result => (
                      <View key={result.specimen_number} style={s.resultRow}>
                        <View style={s.resultDesc}>
                          <Text style={{ fontWeight: 'bold' }}>
                            {specimensLabel} {result.specimen_number}
                          </Text>
                          {namedTest ? (
                            namedTest.metrics.map(metric => {
                              const value = result.result_data?.metrics?.[metric.key]
                              if (value === undefined || value === null) return null
                              return (
                                <Text key={metric.key} style={s.metricLine}>
                                  {metric.label}: {value}
                                  {metric.unit ? ` ${metric.unit}` : ''}
                                </Text>
                              )
                            })
                          ) : (
                            <Text style={s.metricLine}>
                              Valor: {result.result_value}
                              {units ? ` ${units}` : ''}
                              {result.deviation_percentage !== null
                                ? `  (desviación ${result.deviation_percentage}%)`
                                : ''}
                            </Text>
                          )}
                          {result.notes ? (
                            <Text style={s.metricLine}>Obs: {result.notes}</Text>
                          ) : null}
                        </View>
                        {result.meets_criteria === null ? (
                          <Text style={s.statusNeutral}>SIN EVALUAR</Text>
                        ) : result.meets_criteria ? (
                          <Text style={s.statusOk}>CUMPLE</Text>
                        ) : (
                          <Text style={s.statusFail}>NO CUMPLE</Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )
            })
          )}

          {/* Observaciones */}
          {sample.notes ? (
            <>
              <Text style={s.sectionTitle}>Observaciones</Text>
              <Text style={s.sectionContent}>{sample.notes}</Text>
            </>
          ) : null}

          {/* Veredicto */}
          <View
            style={[
              s.verdictBox,
              { backgroundColor: verdict.background, borderColor: verdict.border },
            ]}
            wrap={false}
          >
            <Text style={[s.verdictLabel, { color: verdict.color }]}>
              Resultado General
            </Text>
            <Text style={[s.verdictValue, { color: verdict.color }]}>
              {verdict.label}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
