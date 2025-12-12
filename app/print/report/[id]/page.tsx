'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, Mail, Globe, MapPin } from 'lucide-react'

// Configuración de marca de Talento Inmobiliario
const BRAND = {
  companyName: 'TALENTO INMOBILIARIO',
  tagline: 'Supervisión Técnica',
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
    logo: '/brand/logo-footer.png' // Logo circular grande
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

export default function PrintReportPage() {
  const params = useParams()
  const supabase = createClient()
  
  const reportId = params.id as string
  
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [reportId])

  // Auto-imprimir cuando cargue
  useEffect(() => {
    if (report && !loading) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [report, loading])

  const loadReport = async () => {
    try {
      setLoading(true)
      
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

      // Cargar datos de la empresa cliente si existe
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando informe...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <p className="text-red-600">{error || 'Informe no encontrado'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen relative print-container">
      {/* ===== ENCABEZADO CON LOGO CIRCULAR GRANDE ===== */}
      <header className="px-12 pt-8 pb-6">
        <div className="flex items-center justify-between">
          {/* Logo circular grande */}
          <div className="flex-shrink-0">
            <img 
              src={BRAND.assets.logo} 
              alt={BRAND.companyName}
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
              <span className="font-semibold">Fecha:</span> {formatDateShort(report.created_at)}
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
      </header>

      {/* Línea separadora verde */}
      <div className="mx-12 h-0.5" style={{ backgroundColor: BRAND.colors.primary }}></div>

      {/* ===== CONTENIDO DEL INFORME ===== */}
      <main className="px-12 py-6 pb-24">
        {/* Información general del proyecto */}
        <section className="mb-8">
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
        </section>

        {/* Secciones del contenido */}
        {report.content && Object.entries(report.content).map(([key, html]) => (
          <section key={key} className="mb-6">
            <div 
              className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:border-b-2 prose-headings:pb-1 prose-headings:mb-3"
              style={{ '--tw-prose-headings-border-color': BRAND.colors.primary } as any}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </section>
        ))}

        {/* Sección de firmas */}
        <section className="mt-12 pt-8">
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
        </section>
      </main>

      {/* ===== PIE DE PÁGINA - 2 LÍNEAS, ANCHO COMPLETO ===== */}
      <footer className="print-footer">
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
      </footer>

      {/* ===== ESTILOS DE IMPRESIÓN ===== */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm;
          }
          
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-container {
            min-height: auto;
          }

          /* Footer fijo en todas las páginas, fuera de márgenes */
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            margin: 0 -15mm;
            padding: 0 15mm;
          }

          /* Evitar cortes de contenido */
          section {
            page-break-inside: avoid;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          tr {
            page-break-inside: avoid;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
          }
          
          p {
            orphans: 3;
            widows: 3;
          }
          
          .prose p {
            page-break-inside: avoid;
          }

          /* Espacio para el footer */
          main {
            padding-bottom: 45px !important;
          }
        }

        @media screen {
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>
    </div>
  )
}
