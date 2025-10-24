'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Copy, Star } from 'lucide-react'
import type { ReportTemplate } from '@/types/reports'

interface TemplatesListProps {
  templates: ReportTemplate[]
}

export function TemplatesList({ templates: initialTemplates }: TemplatesListProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)

  const handleCreate = () => {
    router.push('/admin/report-templates/new')
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/report-templates/${id}/edit`)
  }

  const handleDuplicate = async (template: ReportTemplate) => {
    // TODO: Implementar duplicación
    console.log('Duplicar plantilla:', template.id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return
    
    // TODO: Implementar eliminación
    console.log('Eliminar plantilla:', id)
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily_log: 'Bitácoras Diarias',
      financial: 'Financiero',
      general: 'General',
      custom: 'Personalizado'
    }
    return labels[type] || type
  }

  return (
    <div>
      {/* Botón crear */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Plantilla
        </button>
      </div>

      {/* Lista de plantillas */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No hay plantillas configuradas</p>
          <button
            onClick={handleCreate}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Crear primera plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {template.template_name}
                    {template.is_default && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {getTypeLabel(template.template_type)}
                  </span>
                  {!template.company_id && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Global
                    </span>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Tamaño:</span>
                    <span className="font-medium">{template.styles.page_size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Orientación:</span>
                    <span className="font-medium capitalize">
                      {template.styles.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Colores:</span>
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: template.styles.primary_color }}
                        title="Color primario"
                      />
                      <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: template.styles.secondary_color }}
                        title="Color secundario"
                      />
                    </div>
                  </div>
                </div>

                {/* Secciones activas */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Secciones incluidas:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.sections.cover_page && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        Portada
                      </span>
                    )}
                    {template.sections.executive_summary && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        Resumen
                      </span>
                    )}
                    {template.sections.ai_insights && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        IA
                      </span>
                    )}
                    {template.sections.photos && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        Fotos
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleEdit(template.id)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicate(template)}
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Duplicar"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {!template.is_default && (
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
