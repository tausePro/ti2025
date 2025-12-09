'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { RichTextEditor } from '@/components/reports/RichTextEditor'
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Loader2, 
  FileText,
  Eye,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Project {
  id: string
  name: string
  project_code: string
}

interface ReportSection {
  id: string
  section_key: string
  section_name: string
  section_order: number
  content_template: string
  base_content: string
  use_ai: boolean
}

interface ProjectTemplate {
  id: string
  template_name: string
  report_type: string | null
}

export default function NewBiweeklyReportPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [sections, setSections] = useState<ReportSection[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [selectedProject, setSelectedProject] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [shortTitle, setShortTitle] = useState('')
  const [longTitle, setLongTitle] = useState('INFORME QUINCENAL DE INTERVENTORÍA Y SUPERVISIÓN TÉCNICA INDEPENDIENTE')
  const [content, setContent] = useState<Record<string, string>>({})
  const [reportId, setReportId] = useState<string | null>(null)
  
  // Templates state
  const [availableTemplates, setAvailableTemplates] = useState<ProjectTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [noTemplateWarning, setNoTemplateWarning] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  // Cargar plantillas disponibles cuando se selecciona proyecto
  useEffect(() => {
    if (selectedProject) {
      loadAvailableTemplates(selectedProject)
    } else {
      setAvailableTemplates([])
      setSelectedTemplateId('')
      setSections([])
      setContent({})
      setNoTemplateWarning(false)
    }
  }, [selectedProject])

  // Cargar secciones cuando se selecciona plantilla
  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateSections(selectedTemplateId)
    } else {
      setSections([])
      setContent({})
    }
  }, [selectedTemplateId])

  const loadProjects = async () => {
    try {
      setLoading(true)

      // Cargar proyectos del usuario (donde es miembro activo)
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('is_archived', false)
        .order('name')

      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableTemplates = async (projectId: string) => {
    try {
      // Buscar TODAS las plantillas activas del proyecto
      const { data: templatesData, error: templatesError } = await supabase
        .from('project_report_templates')
        .select('id, template_name, report_type, is_default')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('template_name')

      if (templatesError || !templatesData || templatesData.length === 0) {
        console.log('⚠️ No hay plantillas configuradas para este proyecto')
        setAvailableTemplates([])
        setSelectedTemplateId('')
        setSections([])
        setContent({})
        setNoTemplateWarning(true)
        return
      }

      setAvailableTemplates(templatesData)
      setNoTemplateWarning(false)
      
      // Auto-seleccionar la plantilla default o la primera
      const defaultTemplate = templatesData.find((t: any) => t.is_default) || templatesData[0]
      setSelectedTemplateId(defaultTemplate.id)
      
      console.log('✅ Plantillas disponibles:', templatesData.length)

    } catch (error) {
      console.error('Error loading templates:', error)
      setNoTemplateWarning(true)
    }
  }

  const loadTemplateSections = async (templateId: string) => {
    try {
      // Cargar secciones de la plantilla seleccionada
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('section_templates')
        .select('*')
        .eq('project_template_id', templateId)
        .eq('is_active', true)
        .order('section_order')

      if (sectionsError) {
        console.error('Error cargando secciones:', sectionsError)
        return
      }

      setSections(sectionsData || [])

      // Inicializar contenido con base_content o content_template
      if (sectionsData && sectionsData.length > 0) {
        const initialContent: Record<string, string> = {}
        sectionsData.forEach((section: any) => {
          initialContent[section.section_key] = section.base_content || section.content_template || ''
        })
        setContent(initialContent)
        
        const template = availableTemplates.find(t => t.id === templateId)
        console.log('✅ Secciones cargadas:', sectionsData.length, 'para', template?.template_name)
      } else {
        setContent({})
        console.log('⚠️ La plantilla no tiene secciones')
      }

    } catch (error) {
      console.error('Error loading template sections:', error)
    }
  }

  const handleGenerateContent = async () => {
    if (!selectedProject || !periodStart || !periodEnd || !selectedTemplateId) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    if (sections.length === 0) {
      alert('La plantilla seleccionada no tiene secciones configuradas')
      return
    }

    try {
      setGenerating(true)

      // 1. Generar informe desde plantilla del proyecto
      const response = await fetch('/api/reports/generate-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          templateId: selectedTemplateId,
          periodStart,
          periodEnd
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al generar informe')
      }

      const data = await response.json()
      
      // Actualizar contenido generado
      setContent(data.content)
      setShortTitle(data.shortTitle)
      setLongTitle(data.longTitle)

      // Mostrar resumen de datos recopilados
      const summary = data.sourceData?.summary
      const message = `✅ Informe generado exitosamente

📊 Datos recopilados:
- ${data.sourceData?.dailyLogsCount || 0} bitácoras diarias
- ${data.sourceData?.qualityControlCount || 0} ensayos de control de calidad
- ${data.sourceData?.photosCount || 0} fotos
- ${summary?.workDays || 0} días trabajados
- ${summary?.totalTests || 0} ensayos realizados

El contenido se generó automáticamente desde la plantilla del proyecto.`

      alert(message)
    } catch (error: any) {
      console.error('Error generating content:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedProject || !periodStart || !periodEnd) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setSaving(true)

      // Generar número de informe
      const { data: reportNumber } = await supabase
        .rpc('generate_report_number', {
          p_project_id: selectedProject,
          p_period_start: periodStart
        })

      // Recopilar datos fuente
      const { data: sourceData } = await supabase
        .rpc('collect_report_data', {
          p_project_id: selectedProject,
          p_period_start: periodStart,
          p_period_end: periodEnd
        })

      const reportData = {
        project_id: selectedProject,
        report_number: reportNumber,
        period_start: periodStart,
        period_end: periodEnd,
        short_title: shortTitle,
        long_title: longTitle,
        content: content,
        source_data: sourceData,
        status: 'draft',
        created_by: profile?.id
      }

      if (reportId) {
        // Actualizar borrador existente
        const { error } = await supabase
          .from('biweekly_reports')
          .update(reportData)
          .eq('id', reportId)

        if (error) throw error
      } else {
        // Crear nuevo borrador
        const { data, error } = await supabase
          .from('biweekly_reports')
          .insert(reportData)
          .select()
          .single()

        if (error) throw error
        setReportId(data.id)
      }

      alert('✅ Borrador guardado exitosamente')
    } catch (error: any) {
      console.error('Error saving draft:', error)
      alert('Error al guardar borrador: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!reportId) {
      alert('Primero debes guardar el borrador')
      return
    }

    if (!confirm('¿Estás seguro de enviar este informe para revisión? No podrás editarlo después.')) {
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('biweekly_reports')
        .update({
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
          submitted_by: profile?.id
        })
        .eq('id', reportId)

      if (error) throw error

      alert('✅ Informe enviado para revisión. El supervisor será notificado.')
      router.push('/reports/biweekly')
    } catch (error: any) {
      console.error('Error submitting report:', error)
      alert('Error al enviar informe: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/reports/biweekly"
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a Informes
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nuevo Informe Quincenal</h1>
        <p className="text-gray-600">Genera un borrador del informe con los datos recopilados del proyecto</p>
      </div>

      {/* Configuración inicial */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuración del Informe</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proyecto *
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccione un proyecto...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título Corto
            </label>
            <input
              type="text"
              value={shortTitle}
              onChange={(e) => setShortTitle(e.target.value)}
              placeholder="Informe Quincenal 01/2025"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio *
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Fin *
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título del Informe
          </label>
          <input
            type="text"
            value={longTitle}
            onChange={(e) => setLongTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Alerta si no hay plantilla */}
        {noTemplateWarning && selectedProject && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>No hay plantilla configurada para este proyecto.</strong>
              <br />
              El supervisor debe asignar una plantilla desde la configuración del proyecto antes de poder generar informes.
              <Link 
                href={`/projects/${selectedProject}/report-template`}
                className="ml-2 text-blue-600 hover:underline"
              >
                Ir a configurar plantilla →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Selector de plantilla */}
        {availableTemplates.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plantilla a usar *
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {availableTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.template_name}
                  {template.report_type && ` (${template.report_type})`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {sections.length > 0 
                ? `✓ ${sections.length} secciones disponibles`
                : '⚠️ Esta plantilla no tiene secciones configuradas'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleGenerateContent}
            disabled={generating || !selectedProject || !periodStart || !periodEnd || noTemplateWarning || sections.length === 0}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Generar Borrador
              </>
            )}
          </button>

          {reportId && (
            <Link
              href={`/reports/biweekly/${reportId}/preview`}
              className="inline-flex items-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Eye className="w-5 h-5 mr-2" />
              Vista Previa PDF
            </Link>
          )}
        </div>
      </div>

      {/* Secciones del informe */}
      {Object.keys(content).length > 0 && (
        <div className="space-y-6 mb-6">
          {sections.map((section) => {
            const sectionContent = content[section.section_key]
            if (!sectionContent) return null

            return (
              <div key={section.section_key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {section.section_name}
                </h3>
                <RichTextEditor
                  content={sectionContent}
                  onChange={(newContent) => {
                    setContent(prev => ({
                      ...prev,
                      [section.section_key]: newContent
                    }))
                  }}
                  placeholder={`Contenido de ${section.section_name}...`}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Acciones */}
      {Object.keys(content).length > 0 && (
        <div className="flex gap-4 justify-end sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Guardar Borrador
              </>
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !reportId}
            className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5 mr-2" />
            Enviar para Revisión
          </button>
        </div>
      )}
    </div>
  )
}
