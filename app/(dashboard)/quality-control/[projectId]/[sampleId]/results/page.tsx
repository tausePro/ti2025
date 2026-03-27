'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  }
  results: Array<{
    id: string
    specimen_number: number
    result_value: number
    meets_criteria: boolean | null
    notes: string
  }>
}

interface ResultEntry {
  specimen_number: number
  result_value: string
  notes: string
}

export default function RegisterResultsPage({ 
  params 
}: { 
  params: { projectId: string; sampleId: string } 
}) {
  const { profile } = useAuth()
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: sampleData, error: sampleError } = await supabase
        .from('quality_control_samples')
        .select(`
          *,
          template:quality_control_templates(template_name, template_type, test_configuration)
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
            id, specimen_number, result_value, meets_criteria, notes
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
        notes: r.notes || ''
      })))
    } else {
      // Inicializar formulario vacío
      const count = test.test_config?.cylinders_count || 3
      const entries: ResultEntry[] = []
      for (let i = 1; i <= count; i++) {
        entries.push({ specimen_number: i, result_value: '', notes: '' })
      }
      setResults(entries)
    }
  }

  const updateResult = (index: number, field: keyof ResultEntry, value: string) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const handleSave = async () => {
    if (!selectedTest || !profile) return

    // Validar que al menos un resultado tenga valor
    const filledResults = results.filter(r => r.result_value.trim() !== '')
    if (filledResults.length === 0) {
      setError('Ingresa al menos un resultado')
      return
    }

    // Validar que los valores sean números válidos
    for (const r of filledResults) {
      if (isNaN(Number(r.result_value))) {
        setError(`El valor del cilindro ${r.specimen_number} no es un número válido`)
        return
      }
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Obtener resistencia esperada del sample custom_data
      const expectedResistance = sample?.custom_data?.resistencia_esperada || 
        sample?.template?.test_configuration?.acceptance_criteria?.min_value || null

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
        const value = Number(r.result_value)
        let meetsCriteria: boolean | null = null
        let deviationPercentage: number | null = null

        if (expectedResistance && expectedResistance > 0) {
          const percentage = (value / expectedResistance) * 100
          deviationPercentage = Math.round((percentage - 100) * 100) / 100
          meetsCriteria = percentage >= 85 // Criterio estándar: >= 85% de resistencia esperada
        }

        return {
          test_id: selectedTest.id,
          specimen_number: r.specimen_number,
          result_value: value,
          meets_criteria: meetsCriteria,
          deviation_percentage: deviationPercentage,
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

      setSuccess(`Resultados guardados para ${selectedTest.test_name} - ${selectedTest.test_period} días`)
      
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
                        {test.test_name} &mdash; {test.test_period} días
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
              {selectedTest.test_name} &mdash; {selectedTest.test_period} días
            </CardTitle>
            <CardDescription>
              {selectedTest.results.length > 0 
                ? 'Editando resultados existentes' 
                : 'Ingresa los valores obtenidos para cada cilindro/probeta'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">
                    Cilindro {result.specimen_number}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={result.result_value}
                    onChange={(e) => updateResult(index, 'result_value', e.target.value)}
                    placeholder="Valor obtenido"
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium">Observaciones</Label>
                  <Input
                    value={result.notes}
                    onChange={(e) => updateResult(index, 'notes', e.target.value)}
                    placeholder="Observaciones del cilindro (opcional)"
                    className="mt-1"
                  />
                </div>
              </div>
            ))}

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
