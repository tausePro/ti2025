'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { formatDateValue } from '@/lib/utils'
import { evaluateTestResults } from '@/lib/quality-control/evaluation'
import {
  evaluateNamedTest,
  findNamedTest,
  describeCriterion,
  resolveMetricCriterion
} from '@/lib/quality-control/metrics'

interface QualityTest {
  id: string
  test_name: string
  test_period: number
  test_date: string
  actual_test_date: string | null
  status: string
  test_config: {
    cylinders_count?: number
    expected_resistance?: number
    named_test_key?: string
  }
  results: Array<{
    id: string
    specimen_number: number
    result_value: number
    result_data: { metrics?: Record<string, number> } | null
    meets_criteria: boolean | null
    notes: string
  }>
}

interface ResultEntry {
  specimen_number: number
  result_value: string
  metric_values: Record<string, string>
  notes: string
}

export default function RegisterResultsPage() {
  const { profile } = useAuth()
  const params = useParams<{ projectId: string; sampleId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [sample, setSample] = useState<any>(null)
  const [tests, setTests] = useState<QualityTest[]>([])
  const [selectedTest, setSelectedTest] = useState<QualityTest | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const expectedValue =
    sample?.custom_data?.resistencia_esperada ??
    selectedTest?.test_config?.expected_resistance ??
    null

  const resultUnits = sample?.template?.test_configuration?.units || ''

  const namedTest = useMemo(
    () =>
      findNamedTest(
        sample?.template?.test_configuration,
        selectedTest?.test_config?.named_test_key
      ),
    [sample, selectedTest]
  )

  const specimensLabel =
    namedTest?.specimens_label ||
    sample?.template?.test_configuration?.specimens_label ||
    'Cilindro'

  const namedEvaluation = useMemo(() => {
    if (!namedTest) return null

    const specimens = results.map(r => ({
      specimenNumber: r.specimen_number,
      values: Object.fromEntries(
        Object.entries(r.metric_values)
          .filter(([, value]) => value.trim() !== '' && !isNaN(Number(value)))
          .map(([key, value]) => [key, Number(value)])
      )
    }))

    return evaluateNamedTest(specimens, namedTest, sample?.custom_data)
  }, [namedTest, results, sample])

  const evaluation = useMemo(() => {
    if (!selectedTest || namedTest) return null

    const specimens = results
      .filter(r => r.result_value.trim() !== '' && !isNaN(Number(r.result_value)))
      .map(r => ({ specimenNumber: r.specimen_number, value: Number(r.result_value) }))

    return evaluateTestResults({
      specimens,
      expectedValue,
      period: selectedTest.test_period,
      testConfiguration: sample?.template?.test_configuration,
      validationRules: sample?.template?.validation_rules
    })
  }, [selectedTest, namedTest, results, expectedValue, sample])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: sampleData, error: sampleError } = await supabase
        .from('quality_control_samples')
        .select(`
          *,
          template:quality_control_templates(template_name, template_type, test_configuration, validation_rules)
        `)
        .eq('id', params.sampleId)
        .single()

      if (sampleError) throw sampleError
      setSample(sampleData)

      const { data: testsData, error: testsError } = await supabase
        .from('quality_control_tests')
        .select(`
          *,
          results:quality_control_results(
            id, specimen_number, result_value, result_data, meets_criteria, notes
          )
        `)
        .eq('sample_id', params.sampleId)
        .order('test_period')

      if (testsError) throw testsError
      setTests(testsData || [])
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTest = (test: QualityTest) => {
    setSelectedTest(test)
    setError(null)
    setSuccess(null)

    if (test.results.length > 0) {
      // Cargar resultados existentes para edición
      setResults(test.results.map(r => ({
        specimen_number: r.specimen_number,
        result_value: r.result_value.toString(),
        metric_values: Object.fromEntries(
          Object.entries(r.result_data?.metrics || {}).map(([key, value]) => [
            key,
            String(value)
          ])
        ),
        notes: r.notes || ''
      })))
    } else {
      // Inicializar formulario vacío
      const count = test.test_config?.cylinders_count || 3
      const entries: ResultEntry[] = []
      for (let i = 1; i <= count; i++) {
        entries.push({ specimen_number: i, result_value: '', metric_values: {}, notes: '' })
      }
      setResults(entries)
    }
  }

  const updateResult = (index: number, field: 'result_value' | 'notes', value: string) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const updateMetricValue = (index: number, metricKey: string, value: string) => {
    setResults(prev => prev.map((r, i) =>
      i === index
        ? { ...r, metric_values: { ...r.metric_values, [metricKey]: value } }
        : r
    ))
  }

  const handleSave = async () => {
    if (!selectedTest || !profile) return

    // Validar según tipo de ensayo
    let filledResults: ResultEntry[]
    if (namedTest) {
      filledResults = results.filter(r =>
        Object.values(r.metric_values).some(v => v.trim() !== '')
      )
      if (filledResults.length === 0) {
        setError('Ingresa al menos un valor de métrica')
        return
      }
      for (const r of filledResults) {
        for (const [key, value] of Object.entries(r.metric_values)) {
          if (value.trim() !== '' && isNaN(Number(value))) {
            const metric = namedTest.metrics.find(m => m.key === key)
            setError(
              `El valor de "${metric?.label || key}" de la ${specimensLabel.toLowerCase()} ${r.specimen_number} no es un número válido`
            )
            return
          }
        }
      }
    } else {
      filledResults = results.filter(r => r.result_value.trim() !== '')
      if (filledResults.length === 0) {
        setError('Ingresa al menos un resultado')
        return
      }
      for (const r of filledResults) {
        if (isNaN(Number(r.result_value))) {
          setError(`El valor de ${specimensLabel.toLowerCase()} ${r.specimen_number} no es un número válido`)
          return
        }
      }
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Si ya existen resultados, eliminar los anteriores
      if (selectedTest.results.length > 0) {
        const { error: deleteError } = await supabase
          .from('quality_control_results')
          .delete()
          .eq('test_id', selectedTest.id)

        if (deleteError) throw deleteError
      }

      // Insertar resultados
      const resultsToInsert = filledResults.map(r => {
        if (namedTest) {
          const specimenEval = namedEvaluation?.specimens.find(
            s => s.specimenNumber === r.specimen_number
          )
          const metrics: Record<string, number> = {}
          for (const [key, value] of Object.entries(r.metric_values)) {
            if (value.trim() !== '' && !isNaN(Number(value))) {
              metrics[key] = Number(value)
            }
          }
          // Persistir también las métricas calculadas
          for (const metricEval of specimenEval?.metrics || []) {
            if (metricEval.computed && metricEval.value !== null) {
              metrics[metricEval.key] = metricEval.value
            }
          }
          const primaryMetric = namedTest.metrics.find(
            m => !m.computed && metrics[m.key] !== undefined
          )

          return {
            test_id: selectedTest.id,
            specimen_number: r.specimen_number,
            result_value: primaryMetric ? metrics[primaryMetric.key] : 0,
            result_data: { metrics },
            meets_criteria: specimenEval?.meetsCriteria ?? null,
            deviation_percentage: null,
            notes: r.notes.trim() || null,
            tested_by: profile.id
          }
        }

        const specimen = evaluation?.specimens.find(
          s => s.specimenNumber === r.specimen_number
        )

        return {
          test_id: selectedTest.id,
          specimen_number: r.specimen_number,
          result_value: Number(r.result_value),
          meets_criteria: specimen?.meetsThreshold ?? null,
          deviation_percentage: specimen?.deviationPercentage ?? null,
          notes: r.notes.trim() || null,
          tested_by: profile.id
        }
      })

      const { error: insertError } = await supabase
        .from('quality_control_results')
        .insert(resultsToInsert)

      if (insertError) throw insertError

      // Actualizar estado del ensayo
      const { error: updateError } = await supabase
        .from('quality_control_tests')
        .update({ 
          status: 'completed',
          actual_test_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', selectedTest.id)

      if (updateError) throw updateError

      const verdict = namedTest
        ? namedEvaluation?.meetsCriteria === null || namedEvaluation === null
          ? 'guardado sin evaluación automática'
          : namedEvaluation.meetsCriteria
            ? 'CUMPLE'
            : `NO CUMPLE (${namedEvaluation.failures.length} criterio${namedEvaluation.failures.length > 1 ? 's' : ''} incumplido${namedEvaluation.failures.length > 1 ? 's' : ''})`
        : evaluation?.evaluable
          ? evaluation.meetsCriteria
            ? 'CUMPLE'
            : `NO CUMPLE (promedio ${evaluation.average} ${resultUnits} contra un mínimo de ${evaluation.threshold} ${resultUnits})`
          : 'guardado sin evaluación automática'

      const testLabel = selectedTest.test_period > 0
        ? `${selectedTest.test_name} - ${selectedTest.test_period} días`
        : selectedTest.test_name

      setSuccess(`Resultados guardados para ${testLabel}: ${verdict}`)
      
      // Recargar datos
      await loadData()
      setSelectedTest(null)
      setResults([])
    } catch (err: any) {
      console.error('Error saving results:', err)
      setError(err.message || 'Error al guardar resultados')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; Icon: any }> = {
      pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800', Icon: Clock },
      in_progress: { label: 'En Proceso', className: 'bg-blue-100 text-blue-800', Icon: Clock },
      completed: { label: 'Completado', className: 'bg-green-100 text-green-800', Icon: CheckCircle },
      cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800', Icon: AlertTriangle }
    }
    const c = config[status] || config.pending
    return (
      <Badge className={c.className}>
        <c.Icon className="w-3 h-3 mr-1" />
        {c.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-center text-gray-600">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href={`/quality-control/${params.projectId}/${params.sampleId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Detalles
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Registrar Resultados
        </h1>
        <p className="text-gray-600">
          Muestra #{sample?.sample_number} &bull; {sample?.template?.template_name}
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Seleccionar ensayo */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleccionar Ensayo</CardTitle>
          <CardDescription>Elige el ensayo al que deseas registrar resultados</CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay ensayos programados</p>
          ) : (
            <div className="space-y-3">
              {tests.map(test => (
                <button
                  key={test.id}
                  type="button"
                  onClick={() => handleSelectTest(test)}
                  className={`w-full text-left p-4 border rounded-lg transition-colors ${
                    selectedTest?.id === test.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {test.test_name}
                        {test.test_period > 0 ? ` — ${test.test_period} días` : ''}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Programado: {formatDateValue(test.test_date, 'es-CO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(test.status)}
                      {test.results.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {test.results.length} resultado{test.results.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario de resultados */}
      {selectedTest && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTest.test_name}
              {selectedTest.test_period > 0 ? ` — ${selectedTest.test_period} días` : ''}
            </CardTitle>
            <CardDescription>
              {selectedTest.results.length > 0
                ? 'Editando resultados existentes'
                : `Ingresa los valores obtenidos para cada ${specimensLabel.toLowerCase()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {namedTest && results.map((result, index) => {
              const specimenEval = namedEvaluation?.specimens.find(
                s => s.specimenNumber === result.specimen_number
              )
              return (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {specimensLabel} {result.specimen_number}
                    </span>
                    {specimenEval?.meetsCriteria !== null && specimenEval !== undefined && (
                      <Badge
                        className={
                          specimenEval.meetsCriteria
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {specimenEval.meetsCriteria ? 'CUMPLE' : 'NO CUMPLE'}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {namedTest.metrics.map(metric => {
                      const metricEval = specimenEval?.metrics.find(m => m.key === metric.key)
                      const criterion = resolveMetricCriterion(metric, sample?.custom_data)
                      const criterionLabel = describeCriterion(criterion, metric.unit)
                      return (
                        <div key={metric.key}>
                          <Label className="text-sm font-medium">
                            {metric.label}
                            {metric.unit ? ` (${metric.unit})` : ''}
                            {criterionLabel && (
                              <span className="ml-1 text-xs text-gray-500 font-normal">
                                criterio {criterionLabel}
                              </span>
                            )}
                          </Label>
                          {metric.computed ? (
                            <div
                              className={`mt-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 ${
                                metricEval?.meets === false
                                  ? 'border-red-300 text-red-700'
                                  : metricEval?.meets === true
                                    ? 'border-green-300 text-green-700'
                                    : 'text-gray-500'
                              }`}
                            >
                              {metricEval?.value !== null && metricEval?.value !== undefined
                                ? metricEval.value
                                : 'Se calcula automáticamente'}
                            </div>
                          ) : (
                            <Input
                              type="number"
                              step="0.001"
                              value={result.metric_values[metric.key] ?? ''}
                              onChange={(e) => updateMetricValue(index, metric.key, e.target.value)}
                              placeholder={metric.unit ? `Valor en ${metric.unit}` : 'Valor obtenido'}
                              className={`mt-1 ${
                                metricEval?.meets === false ? 'border-red-400' : ''
                              }`}
                            />
                          )}
                          {metricEval?.message && (
                            <p className="mt-1 text-xs text-red-700">{metricEval.message}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Observaciones</Label>
                    <Input
                      value={result.notes}
                      onChange={(e) => updateResult(index, 'notes', e.target.value)}
                      placeholder="Observaciones (opcional)"
                      className="mt-1"
                    />
                  </div>
                </div>
              )
            })}

            {namedTest && namedEvaluation && namedEvaluation.meetsCriteria !== null && (
              <div className="rounded-lg border p-4 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Resultado del ensayo</span>
                  <Badge
                    className={
                      namedEvaluation.meetsCriteria
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {namedEvaluation.meetsCriteria ? 'CUMPLE' : 'NO CUMPLE'}
                  </Badge>
                </div>
                {namedEvaluation.failures.map((failure, i) => (
                  <p key={i} className="text-sm text-red-700">{failure}</p>
                ))}
              </div>
            )}

            {!namedTest && results.map((result, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">
                    {specimensLabel} {result.specimen_number}
                    {resultUnits ? ` (${resultUnits})` : ''}
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={result.result_value}
                      onChange={(e) => updateResult(index, 'result_value', e.target.value)}
                      placeholder={resultUnits ? `Valor obtenido en ${resultUnits}` : 'Valor obtenido'}
                      className="flex-1"
                    />
                    {resultUnits && (
                      <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm">
                        {resultUnits}
                      </span>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium">Observaciones</Label>
                  <Input
                    value={result.notes}
                    onChange={(e) => updateResult(index, 'notes', e.target.value)}
                    placeholder="Observaciones (opcional)"
                    className="mt-1"
                  />
                </div>
              </div>
            ))}

            {evaluation && evaluation.specimens.length > 0 && (
              <div className="rounded-lg border p-4 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Promedio de {evaluation.specimens.length} probeta
                    {evaluation.specimens.length > 1 ? 's' : ''}
                  </span>
                  <span className="font-semibold">
                    {evaluation.average} {resultUnits}
                  </span>
                </div>

                {evaluation.evaluable ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Mínimo a {selectedTest.test_period} días ({evaluation.minPercentage}% de{' '}
                        {expectedValue} {resultUnits})
                      </span>
                      <span className="font-semibold">
                        {evaluation.threshold} {resultUnits}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-gray-600">Resultado del ensayo</span>
                      <Badge
                        className={
                          evaluation.meetsCriteria
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {evaluation.meetsCriteria ? 'CUMPLE' : 'NO CUMPLE'}
                      </Badge>
                    </div>
                    {!evaluation.meetsCriteria && evaluation.message && (
                      <p className="text-sm text-red-700">{evaluation.message}</p>
                    )}
                    {evaluation.specimens.some(s => s.meetsThreshold === false) && (
                      <p className="text-sm text-amber-700">
                        Probetas bajo el mínimo individual:{' '}
                        {evaluation.specimens
                          .filter(s => s.meetsThreshold === false)
                          .map(s => s.specimenNumber)
                          .join(', ')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-amber-700">
                    {evaluation.reason === 'sin_valor_esperado'
                      ? 'La muestra no tiene resistencia esperada registrada, así que estos resultados se guardarán sin evaluación automática.'
                      : `El período de ${selectedTest.test_period} días no tiene criterio de aceptación en la plantilla, así que estos resultados se guardarán sin evaluación automática.`}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => { setSelectedTest(null); setResults([]) }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Resultados'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
