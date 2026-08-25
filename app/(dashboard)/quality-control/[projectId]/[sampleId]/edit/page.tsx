'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface CustomField {
  name: string
  type: string
  label: string
  required?: boolean
  placeholder?: string
  options?: string[]
  unit?: string
  default?: unknown
  min?: number
  max?: number
}

interface SampleTemplate {
  template_name: string
  custom_fields: CustomField[]
}

type CustomFormData = Record<string, unknown>

export default function EditSamplePage() {
  const params = useParams<{ projectId: string; sampleId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [template, setTemplate] = useState<SampleTemplate | null>(null)
  const [sampleNumber, setSampleNumber] = useState('')
  const [sampleCode, setSampleCode] = useState('')
  const [sampleDate, setSampleDate] = useState('')
  const [originalSampleDate, setOriginalSampleDate] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [customFormData, setCustomFormData] = useState<CustomFormData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSample()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSample = async () => {
    try {
      const { data, error: sampleError } = await supabase
        .from('quality_control_samples')
        .select(`
          *,
          template:quality_control_templates(template_name, custom_fields)
        `)
        .eq('id', params.sampleId)
        .single()

      if (sampleError) throw sampleError

      setTemplate(data.template)
      setSampleNumber(data.sample_number || '')
      setSampleCode(data.sample_code || '')
      setSampleDate(data.sample_date || '')
      setOriginalSampleDate(data.sample_date || '')
      setLocation(data.location || '')
      setNotes(data.notes || '')
      setCustomFormData(data.custom_data || {})
    } catch (err) {
      console.error('Error loading sample:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar la muestra')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomFieldChange = (fieldName: string, value: unknown) => {
    setCustomFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const validateForm = () => {
    if (!sampleNumber.trim()) {
      setError('El número de muestra es requerido')
      return false
    }

    if (!sampleDate) {
      setError('La fecha de muestra es requerida')
      return false
    }

    for (const field of template?.custom_fields || []) {
      if (field.required && !customFormData[field.name]) {
        setError(`El campo "${field.label}" es requerido`)
        return false
      }
    }

    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('quality_control_samples')
        .update({
          sample_number: sampleNumber.trim(),
          sample_code: sampleCode.trim(),
          sample_date: sampleDate,
          location: location.trim(),
          notes: notes.trim(),
          custom_data: customFormData
        })
        .eq('id', params.sampleId)

      if (updateError) throw updateError

      if (sampleDate !== originalSampleDate) {
        const { data: tests, error: testsError } = await supabase
          .from('quality_control_tests')
          .select('id, test_period, status')
          .eq('sample_id', params.sampleId)

        if (testsError) throw testsError

        const pendingTests = (tests || []).filter(test => test.status === 'pending')

        for (const test of pendingTests) {
          const [year, month, day] = sampleDate.split('-').map(Number)
          const baseDate = new Date(year, month - 1, day)
          baseDate.setDate(baseDate.getDate() + test.test_period)
          const testDate = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`

          const { error: testUpdateError } = await supabase
            .from('quality_control_tests')
            .update({ test_date: testDate })
            .eq('id', test.id)

          if (testUpdateError) throw testUpdateError
        }
      }

      router.push(`/quality-control/${params.projectId}/${params.sampleId}`)
    } catch (err) {
      console.error('Error updating sample:', err)
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
        setError(`Ya existe una muestra con el número "${sampleNumber}" en este proyecto. Usa un número diferente.`)
      } else {
        setError(msg || 'Error al actualizar la muestra')
      }
    } finally {
      setSaving(false)
    }
  }

  const renderCustomField = (field: CustomField) => {
    const rawValue = customFormData[field.name]
    const value = rawValue === undefined || rawValue === null ? '' : String(rawValue)

    switch (field.type) {
      case 'number':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) =>
                handleCustomFieldChange(
                  field.name,
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              min={field.min}
              max={field.max}
              required={field.required}
              className="flex-1"
            />
            {field.unit && (
              <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm">
                {field.unit}
              </span>
            )}
          </div>
        )

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleCustomFieldChange(field.name, newValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Seleccionar ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={`${field.name}-select-${option}-${index}`} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            required={field.required}
          />
        )

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-center text-gray-600">Cargando muestra...</p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert>
          <AlertDescription>
            {error || 'Muestra no encontrada'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/quality-control/${params.projectId}/${params.sampleId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a la Muestra
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Muestra</h1>
        <p className="text-gray-600">{template.template_name}</p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Muestra</CardTitle>
            <CardDescription>
              Datos básicos de identificación de la muestra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sampleNumber">Número de Muestra *</Label>
                <Input
                  id="sampleNumber"
                  value={sampleNumber}
                  onChange={(e) => setSampleNumber(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sampleCode">Código de Muestra</Label>
                <Input
                  id="sampleCode"
                  value={sampleCode}
                  onChange={(e) => setSampleCode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sampleDate">Fecha de Muestra *</Label>
                <Input
                  id="sampleDate"
                  type="date"
                  value={sampleDate}
                  onChange={(e) => setSampleDate(e.target.value)}
                  required
                />
                {sampleDate !== originalSampleDate && (
                  <p className="text-sm text-amber-700 mt-1">
                    Al cambiar la fecha se reprogramarán los ensayos pendientes.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {template.custom_fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Control</CardTitle>
              <CardDescription>
                Información específica según el tipo de control
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.custom_fields.map(field => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {renderCustomField(field)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones importantes sobre la muestra..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
          <Link href={`/quality-control/${params.projectId}/${params.sampleId}`}>
            <Button variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
