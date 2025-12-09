'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, X, Upload, Image as ImageIcon } from 'lucide-react'
import type { ReportTemplate, HeaderConfig, FooterConfig, StylesConfig, SectionsConfig } from '@/types/reports'

interface TemplateFormProps {
  template?: ReportTemplate
  companyId: string | null
  userId: string
}

type TabType = 'basic' | 'header' | 'footer' | 'styles' | 'sections' | 'ai_config' | 'section_templates'

export function TemplateForm({ template, companyId, userId }: TemplateFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Estados del formulario
  const [templateName, setTemplateName] = useState(template?.template_name || '')
  const [templateType, setTemplateType] = useState(template?.template_type || 'bitacora_diaria')
  const [isDefault, setIsDefault] = useState(template?.is_default || false)
  const [isGlobal, setIsGlobal] = useState(!template?.company_id)

  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(
    template?.header_config || {
      logo_url: '',
      company_name: 'Talento Inmobiliario',
      show_project_code: true,
      show_date: true,
      custom_text: 'Reporte de Bitácoras Diarias',
      background_color: '#ffffff',
      text_color: '#1f2937',
      height: 80
    }
  )

  const [footerConfig, setFooterConfig] = useState<FooterConfig>(
    template?.footer_config || {
      show_page_numbers: true,
      show_generation_date: true,
      custom_text: 'Documento confidencial - Uso interno',
      include_signatures: true,
      text_color: '#6b7280',
      height: 60
    }
  )

  const [stylesConfig, setStylesConfig] = useState<StylesConfig>(
    template?.styles || {
      primary_color: '#2563eb',
      secondary_color: '#10b981',
      accent_color: '#f59e0b',
      font_family: 'Helvetica',
      page_size: 'A4',
      orientation: 'portrait',
      margins: { top: 50, bottom: 50, left: 40, right: 40 }
    }
  )

  const [sectionsConfig, setSectionsConfig] = useState<SectionsConfig>(
    template?.sections || {
      // Secciones generales
      cover_page: true,
      table_of_contents: true,
      
      // Secciones de Interventoría
      project_info: true,
      executive_summary: true,
      progress_status: true,
      technical_supervision: true,
      administrative_control: true,
      financial_status: true,
      quality_control: true,
      safety_compliance: true,
      
      // Secciones de Bitácoras
      daily_activities: true,
      personnel_registry: true,
      weather_conditions: true,
      materials_equipment: true,
      photos: true,
      observations: true,
      issues_incidents: true,
      
      // Secciones adicionales
      ai_insights: true,
      recommendations: true,
      signatures: true,
      appendix: false
    }
  )

  // Estado para el contenido de cada sección
  const [sectionContents, setSectionContents] = useState<Record<string, { content: string; useAi: boolean }>>({})

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen')
      return
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar los 2MB')
      return
    }

    try {
      setUploadingLogo(true)
      setError(null)

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Subir a Supabase Storage (bucket project-documents)
      const { data, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath)

      // Actualizar el estado del logo
      setHeaderConfig({ ...headerConfig, logo_url: publicUrl })
    } catch (err: any) {
      console.error('Error subiendo logo:', err)
      setError(err.message || 'Error al subir el logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('El nombre de la plantilla es requerido')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const templateData = {
        template_name: templateName,
        template_type: templateType,
        company_id: isGlobal ? null : companyId,
        is_default: isDefault,
        header_config: headerConfig,
        footer_config: footerConfig,
        styles: stylesConfig,
        sections: sectionsConfig,
        created_by: userId
      }

      let templateId = template?.id

      if (templateId) {
        // Actualizar plantilla existente
        const { error: updateError } = await supabase
          .from('report_templates')
          .update(templateData)
          .eq('id', templateId)

        if (updateError) throw updateError
      } else {
        // Crear nueva plantilla
        const { data: newTemplate, error: insertError } = await supabase
          .from('report_templates')
          .insert(templateData)
          .select('id')
          .single()

        if (insertError) throw insertError
        templateId = newTemplate.id
      }

      // Guardar secciones en section_templates
      // Primero eliminar secciones existentes si es una actualización
      if (template?.id) {
        await supabase
          .from('section_templates')
          .delete()
          .eq('report_template_id', templateId)
      }

      // Mapeo de keys a nombres legibles
      const sectionLabels: Record<string, string> = {
        cover_page: 'Portada',
        table_of_contents: 'Tabla de Contenido',
        project_info: 'Información del Proyecto',
        executive_summary: 'Resumen Ejecutivo',
        progress_status: 'Estado de Avance de Obra',
        technical_supervision: 'Supervisión Técnica',
        administrative_control: 'Control Administrativo',
        financial_status: 'Estado Financiero',
        quality_control: 'Control de Calidad',
        safety_compliance: 'Cumplimiento de Seguridad',
        daily_activities: 'Actividades Diarias',
        personnel_registry: 'Registro de Personal',
        weather_conditions: 'Condiciones Climáticas',
        materials_equipment: 'Materiales y Equipos',
        photos: 'Registro Fotográfico',
        observations: 'Observaciones',
        issues_incidents: 'Novedades e Incidentes',
        ai_insights: 'Análisis con IA',
        recommendations: 'Recomendaciones',
        signatures: 'Firmas y Aprobaciones',
        appendix: 'Anexos'
      }

      // Crear registros de secciones para las secciones activas
      const activeSections = Object.entries(sectionsConfig)
        .filter(([_, isActive]) => isActive)
        .map(([key], index) => ({
          report_template_id: templateId,
          section_key: key,
          section_name: sectionLabels[key] || key,
          section_order: index + 1,
          content_template: sectionContents[key]?.content || `<p>Contenido de ${sectionLabels[key] || key}</p>`,
          base_content: sectionContents[key]?.content || `<p>Contenido de ${sectionLabels[key] || key}</p>`,
          use_ai: sectionContents[key]?.useAi ?? true,
          is_active: true
        }))

      if (activeSections.length > 0) {
        const { error: sectionsError } = await supabase
          .from('section_templates')
          .insert(activeSections)

        if (sectionsError) {
          console.error('Error guardando secciones:', sectionsError)
          // No lanzar error, la plantilla ya se guardó
        }
      }

      router.push('/admin/report-templates')
      router.refresh()
    } catch (err: any) {
      console.error('Error guardando plantilla:', err)
      setError(err.message || 'Error al guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'basic' as TabType, label: 'Información Básica' },
    { id: 'header' as TabType, label: 'Encabezado' },
    { id: 'footer' as TabType, label: 'Pie de Página' },
    { id: 'styles' as TabType, label: 'Estilos' },
    { id: 'sections' as TabType, label: 'Secciones' },
    { id: 'ai_config' as TabType, label: 'Configuración IA' },
    { id: 'section_templates' as TabType, label: 'Contenido Secciones' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Tab: Información Básica */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Plantilla *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Reporte Semanal de Bitácoras"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Informe
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <optgroup label="Informes de Interventoría">
                  <option value="interventoria_administrativa">Interventoría Administrativa</option>
                  <option value="supervision_tecnica">Supervisión Técnica Independiente</option>
                </optgroup>
                <optgroup label="Informes de Bitácora">
                  <option value="bitacora_diaria">Bitácora Diaria</option>
                  <option value="bitacora_semanal">Bitácora Semanal</option>
                  <option value="bitacora_mensual">Bitácora Mensual</option>
                </optgroup>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Plantilla predeterminada</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isGlobal}
                  onChange={(e) => setIsGlobal(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Plantilla global (disponible para todas las empresas)</span>
              </label>
            </div>
          </div>
        )}

        {/* Tab: Encabezado */}
        {activeTab === 'header' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo del Encabezado
              </label>
              
              {/* Preview del logo actual */}
              {headerConfig.logo_url && (
                <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-4">
                    <img 
                      src={headerConfig.logo_url} 
                      alt="Logo" 
                      className="h-16 w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setHeaderConfig({ ...headerConfig, logo_url: '' })}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Eliminar logo
                    </button>
                  </div>
                </div>
              )}

              {/* Botón de subida */}
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    {uploadingLogo ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-600">
                          {headerConfig.logo_url ? 'Cambiar logo' : 'Subir logo'}
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Formatos: JPG, PNG, SVG. Tamaño máximo: 2MB
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Empresa
              </label>
              <input
                type="text"
                value={headerConfig.company_name}
                onChange={(e) => setHeaderConfig({ ...headerConfig, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto Personalizado
              </label>
              <input
                type="text"
                value={headerConfig.custom_text}
                onChange={(e) => setHeaderConfig({ ...headerConfig, custom_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Reporte de Bitácoras Diarias"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de Fondo
                </label>
                <input
                  type="color"
                  value={headerConfig.background_color}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, background_color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de Texto
                </label>
                <input
                  type="color"
                  value={headerConfig.text_color}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, text_color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Altura (px)
              </label>
              <input
                type="number"
                value={headerConfig.height}
                onChange={(e) => setHeaderConfig({ ...headerConfig, height: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="40"
                max="200"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={headerConfig.show_project_code}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, show_project_code: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Mostrar código del proyecto</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={headerConfig.show_date}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, show_date: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Mostrar fecha</span>
              </label>
            </div>
          </div>
        )}

        {/* Tab: Pie de Página */}
        {activeTab === 'footer' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto Personalizado
              </label>
              <input
                type="text"
                value={footerConfig.custom_text}
                onChange={(e) => setFooterConfig({ ...footerConfig, custom_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Documento confidencial"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color de Texto
              </label>
              <input
                type="color"
                value={footerConfig.text_color}
                onChange={(e) => setFooterConfig({ ...footerConfig, text_color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Altura (px)
              </label>
              <input
                type="number"
                value={footerConfig.height}
                onChange={(e) => setFooterConfig({ ...footerConfig, height: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="40"
                max="150"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={footerConfig.show_page_numbers}
                  onChange={(e) => setFooterConfig({ ...footerConfig, show_page_numbers: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Mostrar números de página</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={footerConfig.show_generation_date}
                  onChange={(e) => setFooterConfig({ ...footerConfig, show_generation_date: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Mostrar fecha de generación</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={footerConfig.include_signatures}
                  onChange={(e) => setFooterConfig({ ...footerConfig, include_signatures: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Incluir firmas</span>
              </label>
            </div>
          </div>
        )}

        {/* Tab: Estilos */}
        {activeTab === 'styles' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Primario
                </label>
                <input
                  type="color"
                  value={stylesConfig.primary_color}
                  onChange={(e) => setStylesConfig({ ...stylesConfig, primary_color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Secundario
                </label>
                <input
                  type="color"
                  value={stylesConfig.secondary_color}
                  onChange={(e) => setStylesConfig({ ...stylesConfig, secondary_color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de Acento
                </label>
                <input
                  type="color"
                  value={stylesConfig.accent_color}
                  onChange={(e) => setStylesConfig({ ...stylesConfig, accent_color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño de Página
                </label>
                <select
                  value={stylesConfig.page_size}
                  onChange={(e) => setStylesConfig({ ...stylesConfig, page_size: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="A4">A4</option>
                  <option value="LETTER">Carta (Letter)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orientación
                </label>
                <select
                  value={stylesConfig.orientation}
                  onChange={(e) => setStylesConfig({ ...stylesConfig, orientation: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="portrait">Vertical</option>
                  <option value="landscape">Horizontal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Márgenes (px)
              </label>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Superior</label>
                  <input
                    type="number"
                    value={stylesConfig.margins.top}
                    onChange={(e) => setStylesConfig({
                      ...stylesConfig,
                      margins: { ...stylesConfig.margins, top: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="20"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Inferior</label>
                  <input
                    type="number"
                    value={stylesConfig.margins.bottom}
                    onChange={(e) => setStylesConfig({
                      ...stylesConfig,
                      margins: { ...stylesConfig.margins, bottom: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="20"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Izquierdo</label>
                  <input
                    type="number"
                    value={stylesConfig.margins.left}
                    onChange={(e) => setStylesConfig({
                      ...stylesConfig,
                      margins: { ...stylesConfig.margins, left: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="20"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Derecho</label>
                  <input
                    type="number"
                    value={stylesConfig.margins.right}
                    onChange={(e) => setStylesConfig({
                      ...stylesConfig,
                      margins: { ...stylesConfig.margins, right: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="20"
                    max="100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Secciones */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Selecciona las secciones que se incluirán en el informe PDF
            </p>

            {/* Secciones Generales */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Secciones Generales</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.cover_page}
                    onChange={(e) => setSectionsConfig({ ...sectionsConfig, cover_page: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Portada</span>
                </label>
                <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.table_of_contents}
                    onChange={(e) => setSectionsConfig({ ...sectionsConfig, table_of_contents: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Tabla de Contenido</span>
                </label>
              </div>
            </div>

            {/* Secciones de Interventoría */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Secciones de Interventoría</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'project_info', label: 'Información del Proyecto' },
                  { key: 'executive_summary', label: 'Resumen Ejecutivo' },
                  { key: 'progress_status', label: 'Estado de Avance de Obra' },
                  { key: 'technical_supervision', label: 'Supervisión Técnica' },
                  { key: 'administrative_control', label: 'Control Administrativo' },
                  { key: 'financial_status', label: 'Estado Financiero' },
                  { key: 'quality_control', label: 'Control de Calidad' },
                  { key: 'safety_compliance', label: 'Cumplimiento de Seguridad' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sectionsConfig[key as keyof SectionsConfig]}
                      onChange={(e) => setSectionsConfig({ ...sectionsConfig, [key]: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Secciones de Bitácoras */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Secciones de Bitácoras</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'daily_activities', label: 'Actividades Diarias' },
                  { key: 'personnel_registry', label: 'Registro de Personal' },
                  { key: 'weather_conditions', label: 'Condiciones Climáticas' },
                  { key: 'materials_equipment', label: 'Materiales y Equipos' },
                  { key: 'photos', label: 'Registro Fotográfico' },
                  { key: 'observations', label: 'Observaciones' },
                  { key: 'issues_incidents', label: 'Novedades e Incidentes' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sectionsConfig[key as keyof SectionsConfig]}
                      onChange={(e) => setSectionsConfig({ ...sectionsConfig, [key]: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Secciones Adicionales */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Secciones Adicionales</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'ai_insights', label: 'Análisis con IA' },
                  { key: 'recommendations', label: 'Recomendaciones' },
                  { key: 'signatures', label: 'Firmas y Aprobaciones' },
                  { key: 'appendix', label: 'Anexos' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sectionsConfig[key as keyof SectionsConfig]}
                      onChange={(e) => setSectionsConfig({ ...sectionsConfig, [key]: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Configuración IA */}
        {activeTab === 'ai_config' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Configuración de Inteligencia Artificial</h3>
              <p className="text-sm text-blue-700">
                Entrena cómo la IA escribe en los informes. Define el tono, estilo y vocabulario preferido.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tono de Escritura
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="formal">Formal - Lenguaje profesional y estructurado</option>
                <option value="tecnico">Técnico - Terminología especializada</option>
                <option value="ejecutivo">Ejecutivo - Conciso y orientado a resultados</option>
                <option value="casual">Casual - Lenguaje más accesible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instrucciones para la IA
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Escribe de forma clara y concisa. Usa datos específicos cuando estén disponibles. Mantén un tono profesional..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Guías específicas de cómo debe escribir la IA
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vocabulario Preferido
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Término genérico"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <span className="flex items-center text-gray-400">→</span>
                  <input
                    type="text"
                    placeholder="Término preferido"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Agregar
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ej: "trabajador" → "colaborador", "problema" → "oportunidad de mejora"
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                💡 <strong>Tip:</strong> La configuración de IA se aplicará al generar contenido automático para las secciones del informe.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Contenido Secciones */}
        {activeTab === 'section_templates' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-green-900 mb-2">Preconfiguración de Secciones</h3>
              <p className="text-sm text-green-700">
                Define el contenido predeterminado para cada sección. Usa placeholders como {`{{project_name}}`} o {`{{date}}`}
              </p>
            </div>

            {/* Mostrar solo las secciones activas del Tab 5 */}
            {Object.keys(sectionsConfig).filter(key => sectionsConfig[key as keyof SectionsConfig]).length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">
                  No hay secciones seleccionadas. Ve al tab <strong>&quot;Secciones&quot;</strong> para seleccionar las secciones que incluirá el informe.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(sectionsConfig)
                  .filter(([_, isActive]) => isActive)
                  .map(([key]) => {
                    // Mapeo de keys a labels
                    const sectionLabels: Record<string, string> = {
                      cover_page: 'Portada',
                      table_of_contents: 'Tabla de Contenido',
                      project_info: 'Información del Proyecto',
                      executive_summary: 'Resumen Ejecutivo',
                      progress_status: 'Estado de Avance de Obra',
                      technical_supervision: 'Supervisión Técnica',
                      administrative_control: 'Control Administrativo',
                      financial_status: 'Estado Financiero',
                      quality_control: 'Control de Calidad',
                      safety_compliance: 'Cumplimiento de Seguridad',
                      daily_activities: 'Actividades Diarias',
                      personnel_registry: 'Registro de Personal',
                      weather_conditions: 'Condiciones Climáticas',
                      materials_equipment: 'Materiales y Equipos',
                      photos: 'Registro Fotográfico',
                      observations: 'Observaciones',
                      issues_incidents: 'Novedades e Incidentes',
                      ai_insights: 'Análisis con IA',
                      recommendations: 'Recomendaciones',
                      signatures: 'Firmas y Aprobaciones',
                      appendix: 'Anexos'
                    }

                    return (
                      <div key={key} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{sectionLabels[key] || key}</h4>
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-blue-600 rounded" 
                              checked={sectionContents[key]?.useAi ?? true}
                              onChange={(e) => setSectionContents(prev => ({
                                ...prev,
                                [key]: { ...prev[key], content: prev[key]?.content || '', useAi: e.target.checked }
                              }))}
                            />
                            <span className="text-sm text-gray-600">Usar IA</span>
                          </label>
                        </div>
                        <textarea
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder={`Contenido predeterminado para ${sectionLabels[key] || key}. Usa placeholders como {{project_name}}, {{date}}, etc.`}
                          value={sectionContents[key]?.content || ''}
                          onChange={(e) => setSectionContents(prev => ({
                            ...prev,
                            [key]: { ...prev[key], useAi: prev[key]?.useAi ?? true, content: e.target.value }
                          }))}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Placeholders: {`{{project_name}}, {{period_start}}, {{period_end}}, {{summary.work_days}}`}
                        </p>
                      </div>
                    )
                  })}
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                💡 <strong>Placeholders disponibles:</strong> {`{{project_name}} {{date}} {{progress}} {{client_name}} {{supervisor_name}}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar Plantilla'}
        </button>
      </div>
    </div>
  )
}
