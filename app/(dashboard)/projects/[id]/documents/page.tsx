'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye,
  ArrowLeft,
  File,
  FileImage,
  FileSpreadsheet,
  FilePlus,
  Search,
  Filter
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UploadDocumentDialog } from '@/components/projects/UploadDocumentDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

interface ProjectDocument {
  id: string
  project_id: string
  file_name: string
  file_url: string
  file_type: 'logo' | 'contract' | 'report' | 'photo' | 'drawing' | 'other'
  file_size: number
  mime_type: string
  uploaded_by: string
  uploaded_at: string
  description?: string
  is_public: boolean
  uploader: {
    full_name: string
    email: string
  }
}

interface Project {
  id: string
  name: string
  project_code: string
}

const FILE_TYPE_LABELS: Record<string, string> = {
  logo: 'Logo',
  contract: 'Contrato',
  report: 'Reporte',
  photo: 'Foto',
  drawing: 'Plano',
  other: 'Otro'
}

const FILE_TYPE_COLORS: Record<string, string> = {
  logo: 'bg-purple-100 text-purple-800',
  contract: 'bg-blue-100 text-blue-800',
  report: 'bg-green-100 text-green-800',
  photo: 'bg-yellow-100 text-yellow-800',
  drawing: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800'
}

export default function ProjectDocumentsPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission, profile } = useAuth()
  const supabase = createClient()
  
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    loadProject()
    loadDocuments()
  }, [projectId])

  useEffect(() => {
    filterDocuments()
  }, [documents, searchTerm, filterType])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      logger.error('Error loading project', { projectId }, error as Error)
    }
  }

  const loadDocuments = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('project_documents')
        .select(`
          *,
          uploader:profiles!uploaded_by(
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      setDocuments(data || [])
      logger.info('Documents loaded', { projectId, count: data?.length })
    } catch (error) {
      logger.error('Error loading documents', { projectId }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  const filterDocuments = () => {
    let filtered = documents

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.file_type === filterType)
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredDocuments(filtered)
  }

  const handleDownload = async (document: ProjectDocument) => {
    try {
      // Crear un link temporal para descargar
      const link = window.document.createElement('a')
      link.href = document.file_url
      link.download = document.file_name
      link.click()
      
      logger.info('Document downloaded', { documentId: document.id, fileName: document.file_name })
    } catch (error) {
      logger.error('Error downloading document', { documentId: document.id }, error as Error)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return

    try {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error

      logger.info('Document deleted', { documentId, projectId })
      loadDocuments()
    } catch (error) {
      logger.error('Error deleting document', { documentId }, error as Error)
    }
  }

  const handleDocumentUploaded = () => {
    setShowUploadDialog(false)
    loadDocuments()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5" />
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5" />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5" />
    return <File className="h-5 w-5" />
  }

  const getDocumentStats = () => {
    return {
      total: documents.length,
      contracts: documents.filter(d => d.file_type === 'contract').length,
      reports: documents.filter(d => d.file_type === 'report').length,
      photos: documents.filter(d => d.file_type === 'photo').length,
      drawings: documents.filter(d => d.file_type === 'drawing').length,
    }
  }

  const stats = getDocumentStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-3" />
              Documentos del Proyecto
            </h1>
            {project && (
              <p className="text-gray-500 mt-1">
                {project.project_code} - {project.name}
              </p>
            )}
          </div>
        </div>
        
        {hasPermission('projects', 'update') && (
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Subir Documento
          </Button>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Reportes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Fotos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.photos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drawings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="contract">Contratos</SelectItem>
                  <SelectItem value="report">Reportes</SelectItem>
                  <SelectItem value="photo">Fotos</SelectItem>
                  <SelectItem value="drawing">Planos</SelectItem>
                  <SelectItem value="other">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>
            {filteredDocuments.length} documento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay documentos
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterType !== 'all' 
                  ? 'No se encontraron documentos con los filtros aplicados'
                  : 'Sube el primer documento de este proyecto'
                }
              </p>
              {hasPermission('projects', 'update') && !searchTerm && filterType === 'all' && (
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Primer Documento
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="text-gray-600">
                      {getFileIcon(document.mime_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {document.file_name}
                        </h3>
                        <Badge className={FILE_TYPE_COLORS[document.file_type]}>
                          {FILE_TYPE_LABELS[document.file_type]}
                        </Badge>
                        {document.is_public && (
                          <Badge variant="outline" className="text-xs">
                            Público
                          </Badge>
                        )}
                      </div>
                      
                      {document.description && (
                        <p className="text-sm text-gray-500 mb-1">
                          {document.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatFileSize(document.file_size)}</span>
                        <span>•</span>
                        <span>Subido por {document.uploader.full_name}</span>
                        <span>•</span>
                        <span>{new Date(document.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(document.file_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {hasPermission('projects', 'delete') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(document.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Upload */}
      {showUploadDialog && (
        <UploadDocumentDialog
          projectId={projectId}
          onClose={() => setShowUploadDialog(false)}
          onDocumentUploaded={handleDocumentUploaded}
        />
      )}
    </div>
  )
}
