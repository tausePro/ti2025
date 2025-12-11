'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Download, 
  Printer,
  Loader2,
  FileText,
  Calendar,
  Building2,
  User
} from 'lucide-react'
import Link from 'next/link'

interface Report {
  id: string
  project_id: string
  report_number: string
  period_start: string
  period_end: string
  short_title: string
  long_title: string
  content: Record<string, string>
  status: string
  created_at: string
  source_data?: any
  project?: {
    name: string
    project_code: string
    address?: string
    company_id?: string
  }
  creator?: {
    full_name: string
  }
  company?: {
    name: string
    logo_url: string
  }
}

export default function ReportPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)
  
  const reportId = params.id as string
  
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      
      // Cargar informe con datos relacionados
      const { data: reportData, error: reportError } = await supabase
        .from('biweekly_reports')
        .select(`
          *,
          project:projects(name, project_code, address, company_id),
          creator:profiles!created_by(full_name)
        `)
        .eq('id', reportId)
        .single()

      if (reportError) throw reportError

      if (!reportData) {
        setError('Informe no encontrado')
        return
      }

      // Cargar datos de la empresa si existe
      if (reportData.project?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name, logo_url')
          .eq('id', reportData.project.company_id)
          .single()
        
        if (companyData) {
          reportData.company = companyData
        }
      }

      setReport(reportData)
    } catch (err: any) {
      console.error('Error loading report:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    // Por ahora usamos la función de impresión del navegador
    // En el futuro se puede integrar una librería como jsPDF o html2pdf
    window.print()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando informe...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-600">{error || 'Informe no encontrado'}</p>
          <Link href="/reports/biweekly">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Informes
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Toolbar - No se imprime */}
      <div className="print:hidden bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/reports/biweekly/new">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Editor
              </Button>
            </Link>
            <span className="text-sm text-gray-500">
              Vista previa del informe
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido del PDF */}
      <div className="bg-gray-100 min-h-screen py-8 print:bg-white print:py-0">
        <div 
          ref={printRef}
          className="bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none print:max-w-none"
          style={{ minHeight: '297mm' }}
        >
          {/* Encabezado del documento */}
          <div className="border-b-2 border-gray-300 p-8">
            <div className="flex items-start justify-between">
              {/* Logo de la empresa */}
              <div className="flex-shrink-0">
                {report.company?.logo_url ? (
                  <img 
                    src={report.company.logo_url} 
                    alt={report.company.name}
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="h-16 w-32 bg-gray-100 flex items-center justify-center rounded">
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Información del documento */}
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  <strong>Informe N°:</strong> {report.report_number || 'Sin número'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Fecha:</strong> {formatDate(report.created_at)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Código:</strong> {report.project?.project_code}
                </p>
              </div>
            </div>

            {/* Título del informe */}
            <div className="mt-6 text-center">
              <h1 className="text-xl font-bold text-gray-900 uppercase">
                {report.long_title || 'INFORME QUINCENAL DE INTERVENTORÍA'}
              </h1>
              <p className="text-lg text-gray-700 mt-2">
                {report.project?.name}
              </p>
            </div>

            {/* Período */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                Período: {formatDate(report.period_start)} al {formatDate(report.period_end)}
              </span>
            </div>
          </div>

          {/* Contenido del informe */}
          <div className="p-8">
            {/* Información general */}
            <div className="mb-8">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium w-1/4">
                      Proyecto
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.project?.name}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">
                      Código
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.project?.project_code}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">
                      Ubicación
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.project?.address || (report.source_data?.project_info?.address as string) || 'No especificada'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">
                      Cliente
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.company?.name || 'No especificado'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">
                      Elaborado por
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.creator?.full_name || 'No especificado'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Secciones del contenido */}
            {report.content && Object.entries(report.content).map(([key, html]) => (
              <div key={key} className="mb-6">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            ))}

            {/* Resumen de datos (si existe) */}
            {report.source_data?.summary && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Resumen del Período</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Días trabajados:</span>
                    <span className="ml-2 font-medium">{report.source_data.summary.workDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Días con lluvia:</span>
                    <span className="ml-2 font-medium">{report.source_data.summary.rainDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total trabajadores:</span>
                    <span className="ml-2 font-medium">{report.source_data.summary.totalWorkers || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ensayos realizados:</span>
                    <span className="ml-2 font-medium">{report.source_data.summary.totalTests || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ensayos aprobados:</span>
                    <span className="ml-2 font-medium text-green-600">{report.source_data.summary.passedTests || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ensayos rechazados:</span>
                    <span className="ml-2 font-medium text-red-600">{report.source_data.summary.failedTests || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pie de página */}
          <div className="border-t-2 border-gray-300 p-8 mt-auto">
            <div className="grid grid-cols-2 gap-8">
              {/* Firma del residente */}
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-16">
                  <p className="font-medium text-sm">Elaborado por</p>
                  <p className="text-sm text-gray-600">{report.creator?.full_name}</p>
                  <p className="text-xs text-gray-500">Residente de Interventoría</p>
                </div>
              </div>

              {/* Firma del supervisor */}
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-16">
                  <p className="font-medium text-sm">Revisado por</p>
                  <p className="text-sm text-gray-600">_________________________</p>
                  <p className="text-xs text-gray-500">Supervisor de Interventoría</p>
                </div>
              </div>
            </div>

            {/* Información de la empresa */}
            <div className="mt-8 text-center text-xs text-gray-500">
              <p>{report.company?.name || 'TALENTO INMOBILIARIO S.A.S.'}</p>
              <p>Documento generado el {formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
