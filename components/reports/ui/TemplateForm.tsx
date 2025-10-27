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

type TabType = 'basic' | 'header' | 'footer' | 'styles' | 'sections'

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

      // Subir a Supabase Storage (bucket avatars)
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
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

      const data = {
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

      if (template?.id) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('report_templates')
          .update(data)
          .eq('id', template.id)

        if (updateError) throw updateError
      } else {
        // Crear
        const { error: insertError } = await supabase
          .from('report_templates')
          .insert(data)

        if (insertError) throw insertError
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
    { id: 'sections' as TabType, label: 'Secciones' }
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
