'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  FileText,
  AlertCircle,
  CheckCircle,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  is_active: boolean
  is_default: boolean
  base_template_id: string | null
  report_type?: string | null
  sections_count?: number
}

interface GlobalTemplate {
  id: string
  template_name: string
  template_type: string | null
  description: string | null
  sections_count?: number
}

export default function ProjectReportTemplatePage() {
  const params = useParams()
  const { profile } = useAuth()
  const supabase = createClient()
  
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [assignedTemplates, setAssignedTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([])
  const [selectedGlobalTemplateId, setSelectedGlobalTemplateId] = useState<string>('')

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

      // Cargar plantillas asignadas al proyecto con conteo de secciones
      const { data: templatesData } = await supabase
        .from('project_report_templates')
        .select('id, project_id, template_name, is_active, is_default, base_template_id, report_type')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at')

      if (templatesData) {
        // Obtener conteo de secciones para cada plantilla
        const templatesWithCount = await Promise.all(
          templatesData.map(async (t) => {
            const { count } = await supabase
              .from('section_templates')
              .select('*', { count: 'exact', head: true })
              .eq('project_template_id', t.id)
              .eq('is_active', true)
            return { ...t, sections_count: count || 0 }
          })
        )
        setAssignedTemplates(templatesWithCount)
      }

      // Cargar plantillas globales con conteo de secciones
      const { data: globalTemplatesData } = await supabase
        .from('report_templates')
        .select('id, template_name, template_type, description')
        .eq('is_active', true)
        .order('template_name')

      if (globalTemplatesData) {
        // Obtener conteo de secciones para cada plantilla global
        const globalsWithCount = await Promise.all(
          globalTemplatesData.map(async (t) => {
            const { count } = await supabase
              .from('section_templates')
              .select('*', { count: 'exact', head: true })
              .eq('report_template_id', t.id)
              .eq('is_active', true)
            return { ...t, sections_count: count || 0 }
          })
        )
        setGlobalTemplates(globalsWithCount)
      }

    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Error al cargar datos' })
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTemplate = async () => {
    try {
      setSaving(true)
      
      if (!selectedGlobalTemplateId) {
        setMessage({ type: 'error', text: 'Selecciona una plantilla para continuar.' })
        return
      }

      // Clonar plantilla global al proyecto
      const { data: newTemplateId, error } = await supabase
        .rpc('clone_template_to_project', {
          p_template_id: selectedGlobalTemplateId,
          p_project_id: projectId,
          p_user_id: profile?.id
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Plantilla asignada correctamente al proyecto.' })
      setSelectedGlobalTemplateId('')
      await loadData()

    } catch (error: any) {
      console.error('Error assigning template:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTemplate = async (templateId: string) => {
    if (!confirm('¿Desasignar esta plantilla del proyecto? Los informes existentes no se verán afectados.')) return

    try {
      const { error } = await supabase
        .from('project_report_templates')
        .update({ is_active: false })
        .eq('id', templateId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Plantilla desasignada del proyecto.' })
      await loadData()

    } catch (error: any) {
      console.error('Error removing template:', error)
      setMessage({ type: 'error', text: error.message })
    }
  }

  const handleSetDefault = async (templateId: string) => {
    try {
      // Quitar default de todas las plantillas del proyecto
      await supabase
        .from('project_report_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)

      // Establecer la nueva como default
      const { error } = await supabase
        .from('project_report_templates')
        .update({ is_default: true })
        .eq('id', templateId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Plantilla establecida como predeterminada.' })
      await loadData()

    } catch (error: any) {
      console.error('Error setting default:', error)
      setMessage({ type: 'error', text: error.message })
    }
  }

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

        <h1 className="text-3xl font-bold text-gray-900">
          Plantillas de Informes
        </h1>
        <p className="text-gray-600 mt-1">
          {project?.name} ({project?.project_code})
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Asigna las plantillas de informes que estarán disponibles para los residentes de este proyecto.
        </p>
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

      {/* Asignar nueva plantilla */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Asignar Plantilla</CardTitle>
          <CardDescription>
            Selecciona una plantilla global para habilitarla en este proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plantilla disponible
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGlobalTemplateId}
                onChange={(e) => setSelectedGlobalTemplateId(e.target.value)}
              >
                <option value="">Selecciona una plantilla...</option>
                {globalTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.template_name} ({t.sections_count} secciones)
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleAssignTemplate}
              disabled={saving || !selectedGlobalTemplateId}
            >
              <FileText className="h-4 w-4 mr-2" />
              {saving ? 'Asignando...' : 'Asignar al Proyecto'}
            </Button>
          </div>
          
          {globalTemplates.length === 0 && (
            <p className="text-sm text-amber-600 mt-3">
              No hay plantillas globales configuradas.{' '}
              <Link href="/admin/report-templates" className="text-blue-600 hover:underline">
                Crear plantilla
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plantillas asignadas */}
      <Card>
        <CardHeader>
          <CardTitle>Plantillas Asignadas ({assignedTemplates.length})</CardTitle>
          <CardDescription>
            Estas plantillas están disponibles para que los residentes generen informes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay plantillas asignadas a este proyecto.</p>
              <p className="text-sm mt-1">Asigna una plantilla para que los residentes puedan generar informes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    template.is_default ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`h-8 w-8 ${template.is_default ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.template_name}</span>
                        {template.is_default && (
                          <Badge variant="default" className="text-xs">Predeterminada</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {template.sections_count} secciones • {template.report_type || 'Sin tipo'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {template.base_template_id && (
                      <Link href={`/admin/report-templates/${template.base_template_id}`}>
                        <Button variant="ghost" size="sm" title="Ver plantilla base">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {!template.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                      >
                        Predeterminar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTemplate(template.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
