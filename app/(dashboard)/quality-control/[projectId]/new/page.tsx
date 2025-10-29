'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Plus, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  project_code: string
}

interface QualityTemplate {
  id: string
  template_name: string
  template_type: string
  custom_fields: Array<{
    name: string
    type: string
    label: string
    required?: boolean
    placeholder?: string
    options?: string[]
    unit?: string
    default?: any
    min?: number
    max?: number
  }>
  test_configuration: {
    test_name: string
    test_periods: number[]
    samples_per_test: number
  }
}

interface CustomFormData {
  [key: string]: any
}

export default function NewSamplePage({ params }: { params: { projectId: string } }) {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [project, setProject] = useState<Project | null>(null)
  const [templates, setTemplates] = useState<QualityTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<QualityTemplate | null>(null)
  const [customFormData, setCustomFormData] = useState<CustomFormData>({})
  const [sampleNumber, setSampleNumber] = useState('')
  const [sampleCode, setSampleCode] = useState('')
  const [sampleDate, setSampleDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProject()
    loadTemplates()
  }, [])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('id', params.projectId)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('quality_control_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_type, template_name')

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(template)
    
    // Inicializar formulario con valores por defecto
    const initialData: CustomFormData = {}
    template.custom_fields.forEach(field => {
      if (field.default !== undefined) {
        initialData[field.name] = field.default
      }
    })
    setCustomFormData(initialData)

    // Generar código de muestra automático
    if (project) {
      const typeCode = template.template_type.toUpperCase().substring(0, 4)
      const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      setSampleCode(`${typeCode}-${project.project_code}-${dateCode}`)
    }
  }

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const renderCustomField = (field: any) => {
    const value = customFormData[field.name] || ''

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        )

      case 'number':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => handleCustomFieldChange(field.name, Number(e.target.value))}
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
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
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

  const validateForm = () => {
    if (!selectedTemplate) {
      setError('Debe seleccionar un tipo de control de calidad')
      return false
    }

    if (!sampleNumber.trim()) {
      setError('El número de muestra es requerido')
      return false
    }

    if (!sampleDate) {
      setError('La fecha de muestra es requerida')
      return false
    }

    // Validar campos personalizados requeridos
    for (const field of selectedTemplate.custom_fields) {
      if (field.required && !customFormData[field.name]) {
        setError(`El campo "${field.label}" es requerido`)
        return false
      }
    }

    return true
  }

  const handleSave = async () => {
    if (!validateForm() || !selectedTemplate) return

    try {
      setSaving(true)
      setError(null)

      // Crear la muestra
      const { data: sampleData, error: sampleError } = await supabase
        .from('quality_control_samples')
        .insert({
          project_id: params.projectId,
          template_id: selectedTemplate.id,
          sample_number: sampleNumber.trim(),
          sample_code: sampleCode.trim(),
          sample_date: sampleDate,
          location: location.trim(),
          custom_data: customFormData,
          notes: notes.trim(),
          created_by: profile?.id
        })
        .select()
        .single()

      if (sampleError) throw sampleError

      // Crear ensayos programados según el template
      const testsToCreate = selectedTemplate.test_configuration.test_periods.map((period: number) => ({
        sample_id: sampleData.id,
        test_name: selectedTemplate.test_configuration.test_name,
        test_period: period,
        test_date: new Date(sampleDate).getTime() + (period * 24 * 60 * 60 * 1000), // fecha + días
        test_config: {
          cylinders_count: selectedTemplate.test_configuration.samples_per_test
        }
      }))

      const { error: testsError } = await supabase
        .from('quality_control_tests')
        .insert(testsToCreate)

      if (testsError) throw testsError

      // Redirigir a detalles de la muestra
      router.push(`/quality-control/${params.projectId}/${sampleData.id}`)
    } catch (error: any) {
      console.error('Error saving sample:', error)
      setError(error.message || 'Error al guardar la muestra')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-center text-gray-600">Cargando...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert>
          <AlertDescription>
            Proyecto no encontrado
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/quality-control"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Control de Calidad
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nueva Muestra</h1>
        <p className="text-gray-600">
          Proyecto: {project.project_code} - {project.name}
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Selección de template */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Control de Calidad</CardTitle>
            <CardDescription>
              Seleccione el tipo de control que va a realizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de control..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Información básica */}
        {selectedTemplate && (
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
                    placeholder="Ej: 342"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sampleCode">Código de Muestra</Label>
                  <Input
                    id="sampleCode"
                    value={sampleCode}
                    onChange={(e) => setSampleCode(e.target.value)}
                    placeholder="Código autogenerado"
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
                </div>
                <div>
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: PILAS CIMENTACION TUBERIA 2 -4- C"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campos personalizados */}
        {selectedTemplate && selectedTemplate.custom_fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Control</CardTitle>
              <CardDescription>
                Información específica según el tipo de control
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate.custom_fields.map(field => (
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

        {/* Observaciones */}
        {selectedTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
              <CardDescription>
                Notas adicionales sobre la muestra
              </CardDescription>
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
        )}

        {/* Botones de acción */}
        {selectedTemplate && (
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
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Muestra
                </>
              )}
            </Button>
            <Link href="/quality-control">
              <Button variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
