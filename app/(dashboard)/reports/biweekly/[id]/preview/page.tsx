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
  User,
  Phone,
  Mail,
  Globe,
  MapPin
} from 'lucide-react'
import Link from 'next/link'

// Configuración de marca de Talento Inmobiliario
const BRAND = {
  colors: {
    primary: '#8BC34A',
    primaryDark: '#689F38',
  },
  contact: {
    phone: '(604) 3288739',
    email: 'gerencia@talentoinmobiliario.com',
    website: 'talentoinmobiliario.com',
    address: 'Calle 71 Sur # 43B - 52 Of. 203, Sabaneta'
  },
  assets: {
    logo: '/brand/logo-footer.png'
  }
}

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
    client_company_id?: string
  }
  creator?: {
    full_name: string
    signature_url?: string
    professional_license?: string
    phone?: string
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
          project:projects(name, project_code, address, client_company_id),
          creator:profiles!created_by(full_name, signature_url, professional_license, phone)
        `)
        .eq('id', reportId)
        .single()

      if (reportError) throw reportError

      if (!reportData) {
        setError('Informe no encontrado')
        return
      }

      // Cargar datos de la empresa si existe
      if (reportData.project?.client_company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name, logo_url')
          .eq('id', reportData.project.client_company_id)
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
    // Abrir la página de impresión dedicada (sin layout del dashboard)
    window.open(`/print/report/${reportId}`, '_blank')
  }

  const handleDownloadPDF = async () => {
    // Abrir la página de impresión dedicada (sin layout del dashboard)
    window.open(`/print/report/${reportId}`, '_blank')
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
            <span className="text-xs text-gray-400 mr-2" title="En el diálogo de impresión, desactiva 'Encabezados y pies de página' para quitar fecha/hora">
              💡 Tip: Desactiva encabezados en opciones de impresión
            </span>
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
          className="bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none print:max-w-none relative"
          style={{ minHeight: '297mm' }}
        >
          {/* ===== ENCABEZADO CON LOGO CIRCULAR GRANDE ===== */}
          <div className="px-12 pt-8 pb-6">
            <div className="flex items-center justify-between">
              {/* Logo circular grande */}
              <div className="flex-shrink-0">
                <img 
                  src={BRAND.assets.logo} 
                  alt="Talento Inmobiliario"
                  style={{ width: '100px', height: '100px' }}
                  className="object-contain"
                />
              </div>

              {/* Información del documento */}
              <div className="text-right text-sm space-y-1">
                <p className="text-gray-700">
                  <span className="font-semibold">Informe N°:</span> {report.report_number || 'Sin número'}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Fecha:</span> {formatDate(report.created_at)}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Código:</span> {report.project?.project_code}
                </p>
              </div>
            </div>

            {/* Título del informe */}
            <div className="mt-6 text-center">
              <h1 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
                {report.long_title || 'INFORME QUINCENAL DE INTERVENTORÍA Y SUPERVISIÓN TÉCNICA INDEPENDIENTE'}
              </h1>
              <p className="text-base font-medium mt-2" style={{ color: BRAND.colors.primaryDark }}>
                {report.project?.name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Período: {formatDate(report.period_start)} al {formatDate(report.period_end)}
              </p>
            </div>
          </div>

          {/* Línea separadora verde */}
          <div className="mx-12 h-0.5" style={{ backgroundColor: BRAND.colors.primary }}></div>

          {/* Contenido del informe */}
          <div className="px-12 py-6">
            {/* Información general */}
            <div className="mb-8">
              <h2 className="text-base font-bold text-gray-800 mb-3 pb-1 border-b-2" style={{ borderColor: BRAND.colors.primary }}>
                INFORMACIÓN GENERAL
              </h2>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-medium w-1/4" style={{ backgroundColor: '#f0f7e6' }}>
                      Proyecto
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.project?.name}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-medium" style={{ backgroundColor: '#f0f7e6' }}>
                      Código
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.project?.project_code}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-medium" style={{ backgroundColor: '#f0f7e6' }}>
                      Período
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {formatDate(report.period_start)} al {formatDate(report.period_end)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-medium" style={{ backgroundColor: '#f0f7e6' }}>
                      Ubicación
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.project?.address || (report.source_data?.project_info?.address as string) || 'No especificada'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-medium" style={{ backgroundColor: '#f0f7e6' }}>
                      Cliente
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {report.company?.name || 'No especificado'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-medium" style={{ backgroundColor: '#f0f7e6' }}>
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

          {/* Sección de firmas */}
          <div className="px-12 mt-8">
            <div className="grid grid-cols-2 gap-16">
              {/* Firma del residente */}
              <div className="text-center">
                <div className="h-20 flex items-end justify-center">
                  {report.creator?.signature_url ? (
                    <img 
                      src={report.creator.signature_url} 
                      alt="Firma del residente"
                      className="max-h-16 max-w-[150px] object-contain"
                    />
                  ) : null}
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-semibold text-sm text-gray-800">{report.creator?.full_name}</p>
                  <p className="text-xs text-gray-600">Residente de Interventoría</p>
                  {report.creator?.professional_license && (
                    <p className="text-xs text-gray-500">Lic. Prof. {report.creator.professional_license}</p>
                  )}
                </div>
              </div>

              {/* Firma del supervisor */}
              <div className="text-center">
                <div className="h-20"></div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-semibold text-sm text-gray-800">_________________________</p>
                  <p className="text-xs text-gray-600">Supervisor de Interventoría</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pie de página - 2 líneas, ancho completo */}
          <div className="absolute bottom-0 left-0 right-0 pb-3">
            <div className="h-0.5 w-full" style={{ backgroundColor: BRAND.colors.primary }}></div>
            <div className="py-2 px-4 text-center">
              <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" style={{ color: BRAND.colors.primary }} />
                  {BRAND.contact.phone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" style={{ color: BRAND.colors.primary }} />
                  {BRAND.contact.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" style={{ color: BRAND.colors.primary }} />
                  {BRAND.contact.website}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-1">
                <MapPin className="h-3 w-3" style={{ color: BRAND.colors.primary }} />
                <span>{BRAND.contact.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Ocultar TODO el layout del dashboard */
          aside,
          nav,
          header,
          .sidebar,
          [data-sidebar],
          .print\\:hidden {
            display: none !important;
          }
          
          /* Quitar fondos grises */
          .bg-gray-50,
          .bg-gray-100 {
            background: white !important;
          }
          
          /* Hacer que el contenido principal ocupe todo */
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          /* Resetear el layout flex/grid del dashboard */
          body > div,
          #__next,
          #__next > div,
          .min-h-screen {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          
          /* El contenedor del PDF */
          .bg-white.max-w-\\[210mm\\] {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}
