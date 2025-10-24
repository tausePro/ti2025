'use client'

import { Document, Page } from '@react-pdf/renderer'
import type { ReportTemplate, ProjectData } from '@/types/reports'
import { createPDFStyles } from './PDFStyles'
import { PDFHeader } from './PDFHeader'
import { PDFFooter } from './PDFFooter'

interface PDFDocumentProps {
  template: ReportTemplate
  project: ProjectData
  children: React.ReactNode
}

export function PDFDocument({ template, project, children }: PDFDocumentProps) {
  const styles = createPDFStyles(template.styles)
  const currentDate = new Date().toISOString()

  return (
    <Document
      title={`Reporte - ${project.project_code}`}
      author={template.header_config.company_name || 'Talento Inmobiliario'}
      subject={`Reporte de ${project.name}`}
      creator="TausePro - Sistema de Gestión"
      producer="TausePro"
    >
      <Page
        size={template.styles.page_size}
        orientation={template.styles.orientation}
        style={styles.page}
      >
        {/* Encabezado */}
        <PDFHeader
          config={template.header_config}
          project={project}
          currentDate={currentDate}
        />

        {/* Contenido */}
        {children}

        {/* Pie de página */}
        <PDFFooter
          config={template.footer_config}
          generatedDate={currentDate}
        />
      </Page>
    </Document>
  )
}
