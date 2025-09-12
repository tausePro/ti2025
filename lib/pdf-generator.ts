import { jsPDF } from 'jspdf'

interface ReportData {
  project: {
    name: string
    address: string
    company: {
      name: string
      nit: string
    }
  }
  report: {
    report_type: 'quincenal' | 'mensual'
    period_start: string
    period_end: string
    created_at: string
  }
  dailyLogs: Array<{
    date: string
    weather: string
    personnel_count: number
    activities: Record<string, any>
    materials: Record<string, any>
    equipment: Record<string, any>
    observations: string
    photos: Array<{
      url: string
      tag: string
      caption: string
    }>
  }>
  signatures: Array<{
    user: {
      name: string
      role: string
      signature_url: string
    }
    signed_at: string
  }>
}

export class PDFGenerator {
  private doc: jsPDF
  private pageHeight: number
  private pageWidth: number
  private margin: number
  private currentY: number

  constructor() {
    this.doc = new jsPDF()
    this.pageHeight = this.doc.internal.pageSize.height
    this.pageWidth = this.doc.internal.pageSize.width
    this.margin = 20
    this.currentY = this.margin
  }

  async generateReport(data: ReportData): Promise<Blob> {
    this.addHeader(data)
    this.addProjectInfo(data)
    this.addPeriodInfo(data)
    this.addDailyLogsSection(data)
    this.addSummarySection(data)
    this.addSignaturesSection(data)
    
    return new Blob([this.doc.output('blob')], { type: 'application/pdf' })
  }

  private addHeader(data: ReportData) {
    // Company logo area (placeholder)
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('TALENTO INMOBILIARIO S.A.S', this.margin, this.currentY)
    
    this.currentY += 10
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Supervisión Técnica de Obras', this.margin, this.currentY)
    
    this.currentY += 20
    
    // Report title
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    const reportTitle = `INFORME ${data.report.report_type.toUpperCase()} DE SUPERVISIÓN`
    this.doc.text(reportTitle, this.margin, this.currentY)
    
    this.currentY += 15
  }

  private addProjectInfo(data: ReportData) {
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('INFORMACIÓN DEL PROYECTO', this.margin, this.currentY)
    
    this.currentY += 10
    this.doc.setFont('helvetica', 'normal')
    
    const projectInfo = [
      `Proyecto: ${data.project.name}`,
      `Dirección: ${data.project.address}`,
      `Empresa: ${data.project.company.name}`,
      `NIT: ${data.project.company.nit}`
    ]
    
    projectInfo.forEach(info => {
      this.doc.text(info, this.margin, this.currentY)
      this.currentY += 7
    })
    
    this.currentY += 10
  }

  private addPeriodInfo(data: ReportData) {
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('PERÍODO DEL INFORME', this.margin, this.currentY)
    
    this.currentY += 10
    this.doc.setFont('helvetica', 'normal')
    
    const startDate = new Date(data.report.period_start).toLocaleDateString('es-CO')
    const endDate = new Date(data.report.period_end).toLocaleDateString('es-CO')
    
    this.doc.text(`Desde: ${startDate}`, this.margin, this.currentY)
    this.currentY += 7
    this.doc.text(`Hasta: ${endDate}`, this.margin, this.currentY)
    
    this.currentY += 15
  }

  private addDailyLogsSection(data: ReportData) {
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('BITÁCORAS DIARIAS', this.margin, this.currentY)
    
    this.currentY += 10
    
    data.dailyLogs.forEach((log, index) => {
      this.checkPageBreak(50) // Ensure enough space for log entry
      
      this.doc.setFont('helvetica', 'bold')
      const logDate = new Date(log.date).toLocaleDateString('es-CO')
      this.doc.text(`${index + 1}. ${logDate}`, this.margin, this.currentY)
      
      this.currentY += 8
      this.doc.setFont('helvetica', 'normal')
      
      if (log.weather) {
        this.doc.text(`Clima: ${log.weather}`, this.margin + 10, this.currentY)
        this.currentY += 6
      }
      
      if (log.personnel_count) {
        this.doc.text(`Personal: ${log.personnel_count} personas`, this.margin + 10, this.currentY)
        this.currentY += 6
      }
      
      if (log.observations) {
        this.doc.text('Observaciones:', this.margin + 10, this.currentY)
        this.currentY += 6
        
        const lines = this.doc.splitTextToSize(log.observations, this.pageWidth - 2 * this.margin - 20)
        lines.forEach((line: string) => {
          this.checkPageBreak(6)
          this.doc.text(line, this.margin + 20, this.currentY)
          this.currentY += 6
        })
      }
      
      this.currentY += 8
    })
  }

  private addSummarySection(data: ReportData) {
    this.checkPageBreak(80)
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('RESUMEN EJECUTIVO', this.margin, this.currentY)
    
    this.currentY += 10
    this.doc.setFont('helvetica', 'normal')
    
    // Calculate summary statistics
    const totalDays = data.dailyLogs.length
    const totalPersonnel = data.dailyLogs.reduce((sum, log) => sum + (log.personnel_count || 0), 0)
    const avgPersonnel = totalDays > 0 ? Math.round(totalPersonnel / totalDays) : 0
    
    const summaryStats = [
      `Total de días registrados: ${totalDays}`,
      `Promedio de personal por día: ${avgPersonnel} personas`,
      `Total de personal acumulado: ${totalPersonnel} personas`
    ]
    
    summaryStats.forEach(stat => {
      this.doc.text(stat, this.margin, this.currentY)
      this.currentY += 7
    })
    
    this.currentY += 15
  }

  private addSignaturesSection(data: ReportData) {
    this.checkPageBreak(100)
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('FIRMAS Y APROBACIONES', this.margin, this.currentY)
    
    this.currentY += 20
    
    data.signatures.forEach((signature, index) => {
      const xPosition = this.margin + (index % 2) * (this.pageWidth / 2 - this.margin)
      let yPosition = this.currentY + Math.floor(index / 2) * 60
      
      // Signature line
      this.doc.line(xPosition, yPosition, xPosition + 80, yPosition)
      
      // Name and role
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(signature.user.name, xPosition, yPosition + 8)
      this.doc.text(signature.user.role, xPosition, yPosition + 15)
      
      // Date
      if (signature.signed_at) {
        const signedDate = new Date(signature.signed_at).toLocaleDateString('es-CO')
        this.doc.text(`Fecha: ${signedDate}`, xPosition, yPosition + 22)
      }
    })
    
    this.currentY += Math.ceil(data.signatures.length / 2) * 60 + 20
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage()
      this.currentY = this.margin
    }
  }
}

export async function generateReportPDF(reportData: ReportData): Promise<Blob> {
  const generator = new PDFGenerator()
  return await generator.generateReport(reportData)
}
