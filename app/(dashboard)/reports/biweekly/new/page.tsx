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
  Sparkles,
  Calendar,
  FileText
} from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  project_code: string
}

interface ReportSection {
  section_key: string
  section_name: string
  section_order: number
  content_template: string
  use_ai: boolean
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
  const [content, setContent] = useState<Record<string, { title: string; content: string }>>({})
  const [reportId, setReportId] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // Cargar proyectos del usuario
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('is_archived', false)
        .order('name')

      setProjects(projectsData || [])

      // Cargar secciones del informe
      const { data: sectionsData } = await supabase
        .from('section_templates')
        .select('*')
        .eq('is_active', true)
        .order('section_order')

      setSections(sectionsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateContent = async () => {
    if (!selectedProject || !periodStart || !periodEnd) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setGenerating(true)

      const response = await fetch('/api/reports/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          periodStart,
          periodEnd
        })
      })

      if (!response.ok) {
        throw new Error('Error al generar contenido')
      }

      const data = await response.json()
      setContent(data.content)

      // Generar títulos automáticos
      const project = projects.find(p => p.id === selectedProject)
      if (project) {
        const start = new Date(periodStart)
        const end = new Date(periodEnd)
        setShortTitle(`Informe Quincenal ${start.toLocaleDateString('es-CO')} - ${end.toLocaleDateString('es-CO')}`)
      }

      alert('✅ Contenido generado exitosamente con IA')
    } catch (error) {
      console.error('Error generating content:', error)
      alert('Error al generar contenido. Por favor intenta de nuevo.')
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
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: profile?.id
        })
        .eq('id', reportId)

      if (error) throw error

      alert('✅ Informe enviado para revisión')
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Informe Quincenal</h1>
        <p className="text-gray-600">Genera un informe profesional con ayuda de IA</p>
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

        <button
          onClick={handleGenerateContent}
          disabled={generating || !selectedProject || !periodStart || !periodEnd}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generando con IA...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generar Contenido con IA
            </>
          )}
        </button>
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
                  content={sectionContent.content}
                  onChange={(newContent) => {
                    setContent(prev => ({
                      ...prev,
                      [section.section_key]: {
                        ...sectionContent,
                        content: newContent
                      }
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
