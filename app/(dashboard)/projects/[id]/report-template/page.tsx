'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  FileText,
  AlertCircle,
  CheckCircle,
  Copy
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RichTextEditor } from '@/components/reports/RichTextEditor'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  project_code: string
}

interface ProjectTemplate {
  id: string
  project_id: string
  template_name: string
  description: string
  is_active: boolean
  is_default: boolean
  base_template_id: string | null
  template_key?: string | null
  report_type?: string | null
}

interface GlobalTemplate {
  id: string
  template_name: string
  template_type: string | null
  description: string | null
}

interface Section {
  id: string
  section_key: string
  section_name: string
  section_order: number
  base_content: string
  data_mappings: any
  placeholder_help: string
  use_ai: boolean
  is_active: boolean
}

export default function ProjectReportTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const { profile, hasPermission } = useAuth()
  const supabase = createClient()
  
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([])
  const [selectedGlobalTemplateId, setSelectedGlobalTemplateId] = useState<string>('')
  const [selectedProjectTemplateId, setSelectedProjectTemplateId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar proyecto
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('id', projectId)
        .single()

      if (projectData) {
        setProject(projectData)
      }

      // Cargar plantillas del proyecto (puede haber varias)
      const { data: templatesData } = await supabase
        .from('project_report_templates')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at')

      if (templatesData && templatesData.length > 0) {
        const casted = templatesData as ProjectTemplate[]
        setTemplates(casted)

        // Determinar plantilla seleccionada
        let activeId = selectedProjectTemplateId
        if (!activeId || !casted.some(t => t.id === activeId)) {
          activeId = casted[0].id
        }
        setSelectedProjectTemplateId(activeId)

        // Cargar secciones de la plantilla seleccionada
        const { data: sectionsData } = await supabase
          .from('section_templates')
          .select('*')
          .eq('project_template_id', activeId)
          .eq('is_active', true)
          .order('section_order')

        setSections(sectionsData || [])

        if (sectionsData && sectionsData.length > 0) {
          setSelectedSection(sectionsData[0].id)
        }
      } else {
        setTemplates([])
        setSections([])
        setSelectedProjectTemplateId(null)
        setSelectedSection(null)
      }

      // Cargar plantillas globales activas para que Santiago pueda elegir
      const { data: globalTemplatesData } = await supabase
        .from('report_templates')
        .select('id, template_name, template_type')
        .order('template_name')

      if (globalTemplatesData) {
        setGlobalTemplates(globalTemplatesData as GlobalTemplate[])
      }

    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Error al cargar datos' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      setSaving(true)
      
      if (!selectedGlobalTemplateId) {
        setMessage({ type: 'error', text: 'Selecciona una plantilla global para continuar.' })
        return
      }

      // Clonar plantilla global seleccionada hacia el proyecto
      const { data: newTemplateId, error } = await supabase
        .rpc('clone_template_to_project', {
          p_template_id: selectedGlobalTemplateId,
          p_project_id: projectId,
          p_user_id: profile?.id
        })

      if (error) throw error

      if (newTemplateId) {
        setSelectedProjectTemplateId(newTemplateId as string)
      }

      setMessage({ type: 'success', text: 'Plantilla creada a partir de la plantilla global seleccionada.' })
      await loadData()

    } catch (error: any) {
      console.error('Error creating template:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSection = async (sectionId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('section_templates')
        .update({ base_content: content })
        .eq('id', sectionId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Sección guardada' })
      
      // Actualizar estado local
      setSections(sections.map(s => 
        s.id === sectionId ? { ...s, base_content: content } : s
      ))

    } catch (error: any) {
      console.error('Error saving section:', error)
      setMessage({ type: 'error', text: error.message })
    }
  }

  const handleAddSection = async () => {
    const currentTemplate = templates.find(t => t.id === selectedProjectTemplateId)
    if (!currentTemplate) return

    try {
      const maxOrder = Math.max(...sections.map(s => s.section_order), 0)

      const { data, error } = await supabase
        .from('section_templates')
        .insert({
          project_template_id: currentTemplate.id,
          section_key: `seccion_${Date.now()}`,
          section_name: 'Nueva Sección',
          section_order: maxOrder + 1,
          base_content: '<p>Escribe el contenido base aquí...</p>',
          use_ai: true,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      setSections([...sections, data])
      setSelectedSection(data.id)
      setMessage({ type: 'success', text: 'Sección agregada' })

    } catch (error: any) {
      console.error('Error adding section:', error)
      setMessage({ type: 'error', text: error.message })
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('¿Eliminar esta sección?')) return

    try {
      const { error } = await supabase
        .from('section_templates')
        .update({ is_active: false })
        .eq('id', sectionId)

      if (error) throw error

      setSections(sections.filter(s => s.id !== sectionId))
      setMessage({ type: 'success', text: 'Sección eliminada' })

    } catch (error: any) {
      console.error('Error deleting section:', error)
      setMessage({ type: 'error', text: error.message })
    }
  }

  const currentSection = sections.find(s => s.id === selectedSection)
  const currentTemplate = templates.find(t => t.id === selectedProjectTemplateId) || null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Proyecto
          </Button>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Plantilla de Informe Quincenal
            </h1>
            <p className="text-gray-600 mt-1">
              {project?.name} ({project?.project_code})
            </p>

            {currentTemplate?.base_template_id && (
              <p className="text-sm text-gray-500 mt-2">
                Basada en plantilla global:{' '}
                <Link
                  href={`/admin/report-templates/${currentTemplate.base_template_id}`}
                  className="text-blue-600 hover:underline"
                >
                  Ver plantilla global
                </Link>
              </p>
            )}
          </div>

          {currentTemplate && (
            <Badge variant={currentTemplate.is_active ? 'default' : 'secondary'}>
              {currentTemplate.is_active ? 'Activa' : 'Inactiva'}
            </Badge>
          )}
        </div>
      </div>

      {/* Mensaje */}
      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Agregar plantillas globales al proyecto */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {templates.length === 0
              ? 'No hay plantillas configuradas para este proyecto'
              : 'Agregar otra plantilla desde Plantillas PDF'}
          </CardTitle>
          <CardDescription>
            Selecciona una plantilla global y asígnala a este proyecto. Luego podrás editar sus secciones de forma independiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="global-template">Plantilla global</Label>
              <select
                id="global-template"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGlobalTemplateId}
                onChange={(e) => setSelectedGlobalTemplateId(e.target.value)}
              >
                <option value="">Selecciona una plantilla...</option>
                {globalTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.template_name} {t.template_type ? `(${t.template_type})` : ''}
                  </option>
                ))}
              </select>
              {globalTemplates.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No hay plantillas globales activas. Configúralas desde el panel de administración.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                onClick={handleCreateTemplate}
                disabled={saving || !selectedGlobalTemplateId}
              >
                <FileText className="h-4 w-4 mr-2" />
                {saving ? 'Creando...' : 'Agregar plantilla al proyecto'}
              </Button>

              <Link
                href="/admin/report-templates"
                className="text-xs text-blue-600 hover:underline"
              >
                Gestionar plantillas globales
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Con plantilla(s) */}
      {templates.length > 0 && currentTemplate && (
        <div className="grid grid-cols-12 gap-6">
          {/* Selector de plantilla del proyecto */}
          <div className="col-span-12 mb-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plantillas del Proyecto</CardTitle>
                <CardDescription>
                  Selecciona cuál plantilla quieres configurar para este proyecto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedProjectTemplateId || ''}
                    onChange={(e) => {
                      setSelectedProjectTemplateId(e.target.value || null)
                      // Forzar recarga de secciones para la nueva plantilla
                      if (e.target.value) {
                        supabase
                          .from('section_templates')
                          .select('*')
                          .eq('project_template_id', e.target.value)
                          .eq('is_active', true)
                          .order('section_order')
                          .then(({ data }) => {
                            setSections(data || [])
                            if (data && data.length > 0) {
                              setSelectedSection(data[0].id)
                            } else {
                              setSelectedSection(null)
                            }
                          })
                      }
                    }}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.template_name} {t.report_type ? `(${t.report_type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Lista de secciones */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Secciones</CardTitle>
                <Button onClick={handleAddSection} size="sm" className="w-full mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Sección
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedSection === section.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{section.section_name}</p>
                          <p className="text-xs text-gray-500">Orden: {section.section_order}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSection(section.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editor de sección */}
          <div className="col-span-9">
            {currentSection ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{currentSection.section_name}</CardTitle>
                      <CardDescription>
                        Escribe el contenido base e inserta placeholders
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleSaveSection(currentSection.id, currentSection.base_content)}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Ayuda de placeholders */}
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Placeholders disponibles:</strong>
                      <ul className="mt-2 text-sm space-y-1">
                        <li><code className="bg-gray-100 px-1 rounded">{'{{project_name}}'}</code> - Nombre del proyecto</li>
                        <li><code className="bg-gray-100 px-1 rounded">{'{{period_start}}'}</code> - Fecha inicio</li>
                        <li><code className="bg-gray-100 px-1 rounded">{'{{bitacora.actividades}}'}</code> - Actividades de bitácoras</li>
                        <li><code className="bg-gray-100 px-1 rounded">{'{{qc.ensayos}}'}</code> - Ensayos de control de calidad</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {/* Editor */}
                  <RichTextEditor
                    content={currentSection.base_content || ''}
                    onChange={(content) => {
                      setSections(sections.map(s =>
                        s.id === currentSection.id ? { ...s, base_content: content } : s
                      ))
                    }}
                    placeholder="Escribe el contenido base de esta sección..."
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Selecciona una sección para editar
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
