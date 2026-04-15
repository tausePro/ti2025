import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { formatDateValue } from '@/lib/utils'

const LETTER_W = 612
const LETTER_H = 792

const s = StyleSheet.create({
  page: {
    width: LETTER_W,
    height: LETTER_H,
    position: 'relative',
    paddingTop: 95,
    paddingBottom: 100,
    paddingHorizontal: 56,
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: LETTER_W,
    height: LETTER_H,
  },
  body: {
    flex: 1,
  },
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverProject: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#689F38',
    marginBottom: 4,
  },
  coverDetail: {
    fontSize: 10,
    color: '#555',
    marginBottom: 2,
  },
  coverBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: '10 20',
    marginTop: 16,
    alignItems: 'center',
  },
  docType: {
    fontSize: 8,
    letterSpacing: 2.5,
    color: '#689F38',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 3,
    borderBottomWidth: 2,
    borderBottomColor: '#8BC34A',
    paddingBottom: 4,
  },
  docSubtitle: {
    fontSize: 10,
    color: '#444',
    marginBottom: 2,
  },
  docHeader: {
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  infoItem: {
    width: '50%',
    paddingVertical: 2,
    paddingRight: 10,
  },
  infoLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888',
    fontWeight: 'medium',
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#4a7c10',
    borderLeftWidth: 3,
    borderLeftColor: '#8BC34A',
    paddingLeft: 6,
    marginBottom: 4,
    marginTop: 8,
  },
  sectionContent: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: '#333',
    textAlign: 'justify',
    marginBottom: 6,
  },
  checkGroup: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 3,
    marginBottom: 6,
  },
  checkHeader: {
    backgroundColor: '#f5f5f5',
    padding: '3 8',
    fontWeight: 'bold',
    fontSize: 8.5,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  checkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '3 8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
    fontSize: 8.5,
  },
  checkDesc: {
    flex: 1,
    color: '#333',
    fontWeight: 'medium',
  },
  statusOk: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    padding: '1 4',
    borderRadius: 2,
  },
  statusFail: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#c62828',
    backgroundColor: '#ffebee',
    padding: '1 4',
    borderRadius: 2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  photoItem: {
    width: '48%',
    marginBottom: 4,
  },
  photoImg: {
    width: '100%',
    maxHeight: 160,
    objectFit: 'contain',
    borderWidth: 0.5,
    borderColor: '#ddd',
    borderRadius: 2,
  },
  photoCaption: {
    fontSize: 7,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  signatureName: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#222',
  },
  signatureDetail: {
    fontSize: 8,
    color: '#666',
    lineHeight: 1.4,
  },
  signatureImg: {
    width: 90,
    height: 38,
    objectFit: 'contain',
    marginBottom: 3,
  },
})

function getWeatherLabel(weather: string): string {
  const map: Record<string, string> = {
    soleado: 'Soleado',
    nublado: 'Nublado',
    lluvioso: 'Lluvioso',
    tormentoso: 'Tormentoso',
    parcialmente_nublado: 'Parcialmente Nublado',
  }
  return map[weather] || weather
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface BatchDailyLogPdfProps {
  logs: any[]
  project: any
  residents: Record<string, any>
  customFieldLabels: Record<string, string>
  membreteSrc: string
}

export function BatchDailyLogPdf({
  logs,
  project,
  residents,
  customFieldLabels,
  membreteSrc,
}: BatchDailyLogPdfProps) {
  return (
    <Document
      title={`Bitácoras - ${project?.name || ''}`}
      author="Talento Inmobiliario"
      creator="TausePro"
    >
      {/* Portada */}
      <Page size="LETTER" style={s.page}>
        <View style={s.bg} fixed>
          <Image src={membreteSrc} style={{ width: LETTER_W, height: LETTER_H }} />
        </View>
        <View style={s.coverPage}>
          <Text style={s.coverTitle}>Bitácoras Diarias</Text>
          {project && (
            <>
              <Text style={s.coverProject}>{project.name}</Text>
              <Text style={s.coverDetail}>Código: {project.project_code}</Text>
              {project.address && <Text style={s.coverDetail}>{project.address}</Text>}
            </>
          )}
          <View style={s.coverBox}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#222' }}>
              {logs.length} bitácora{logs.length > 1 ? 's' : ''} incluida{logs.length > 1 ? 's' : ''}
            </Text>
            {logs.length > 0 && (
              <Text style={{ fontSize: 9, color: '#555', marginTop: 3 }}>
                {formatDateValue(logs[0].date, 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                {logs.length > 1 && ` al ${formatDateValue(logs[logs.length - 1].date, 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 8, color: '#999', marginTop: 12 }}>
            Generado: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>
      </Page>

      {/* Cada bitácora */}
      {logs.map((log, index) => {
        const resident = residents[log.created_by] || null
        const assigned = residents[log.assigned_to] || null
        const elaboradoPor = assigned?.full_name || assigned?.email || log.created_by_profile?.full_name || 'Usuario'

        const textSections = [
          { label: 'Actividades Realizadas', content: log.activities },
          { label: 'Materiales Utilizados', content: log.materials },
          { label: 'Equipos Utilizados', content: log.equipment },
          { label: 'Observaciones', content: log.observations },
          { label: 'Problemas Encontrados', content: log.issues },
          { label: 'Recomendaciones', content: log.recommendations },
        ].filter((sec) => sec.content)

        const customFields = Object.entries({ ...(log.custom_fields || {}) }).filter(
          ([key]) => !['checklists', '_field_labels', 'photo_count', 'photo_captions', 'work_front', 'element'].includes(key)
        )

        const photoCaptions: string[] = Array.isArray(log.custom_fields?.photo_captions)
          ? log.custom_fields.photo_captions
          : typeof log.custom_fields?.photo_captions === 'string'
            ? log.custom_fields.photo_captions.split(',')
            : []

        const checklistSections = (log.custom_fields?.checklists || [])
          .map((section: any) => ({
            ...section,
            items: (section.items || []).filter(
              (item: any) => item.status === 'compliant' || item.status === 'non_compliant'
            ),
          }))
          .filter((section: any) => section.items?.length)

        const photos: string[] = log.photos || []

        const dateFormatted = formatDateValue(log.date, 'es-CO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        return (
          <Page key={log.id} size="LETTER" style={s.page} break={index > 0}>
            <View style={s.bg} fixed>
              <Image src={membreteSrc} style={{ width: LETTER_W, height: LETTER_H }} />
            </View>

            <View style={s.body}>
              <View style={s.docHeader}>
                <Text style={s.docType}>Bitácora #{index + 1} de {logs.length}</Text>
                <Text style={s.docTitle}>{dateFormatted}</Text>
                <Text style={s.docSubtitle}>
                  <Text style={{ fontWeight: 'bold' }}>Proyecto: </Text>
                  {project?.name || ''}
                </Text>
              </View>

              <View style={s.infoGrid}>
                <View style={s.infoItem}>
                  <Text style={s.infoLabel}>Clima</Text>
                  <Text style={s.infoValue}>{getWeatherLabel(log.weather)}</Text>
                </View>
                {log.temperature && (
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>Temperatura</Text>
                    <Text style={s.infoValue}>{log.temperature}°C</Text>
                  </View>
                )}
                <View style={s.infoItem}>
                  <Text style={s.infoLabel}>Personal</Text>
                  <Text style={s.infoValue}>{log.personnel_count ?? 0} personas</Text>
                </View>
                <View style={s.infoItem}>
                  <Text style={s.infoLabel}>Elaborado por</Text>
                  <Text style={s.infoValue}>{elaboradoPor}</Text>
                </View>
              </View>

              {(log.work_front || log.element) && (
                <View style={s.infoGrid}>
                  {log.work_front && (
                    <View style={s.infoItem}>
                      <Text style={s.infoLabel}>Frente de Trabajo</Text>
                      <Text style={s.infoValue}>{log.work_front}</Text>
                    </View>
                  )}
                  {log.element && (
                    <View style={s.infoItem}>
                      <Text style={s.infoLabel}>Elemento</Text>
                      <Text style={s.infoValue}>{log.element}</Text>
                    </View>
                  )}
                </View>
              )}

              {textSections.map((sec) => (
                <View key={sec.label} wrap={false}>
                  <Text style={s.sectionTitle}>{sec.label}</Text>
                  <Text style={s.sectionContent}>{stripHtml(sec.content)}</Text>
                </View>
              ))}

              {customFields.length > 0 && (
                <View wrap={false}>
                  <Text style={s.sectionTitle}>Campos Personalizados</Text>
                  <View style={s.infoGrid}>
                    {customFields.map(([key, value]) => (
                      <View key={key} style={s.infoItem}>
                        <Text style={s.infoLabel}>{customFieldLabels[key] || key}</Text>
                        <Text style={s.infoValue}>
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {checklistSections.length > 0 && (
                <View>
                  <Text style={s.sectionTitle}>Checklist</Text>
                  {checklistSections.map((section: any) => (
                    <View key={section.id} style={s.checkGroup} wrap={false}>
                      <Text style={s.checkHeader}>{section.title}</Text>
                      {(section.items || []).map((item: any) => (
                        <View key={item.id} style={s.checkItem}>
                          <Text style={s.checkDesc}>{item.description}</Text>
                          <Text style={item.status === 'compliant' ? s.statusOk : s.statusFail}>
                            {item.status === 'compliant' ? 'Cumple' : 'No cumple'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {photos.length > 0 && (
                <View>
                  <Text style={s.sectionTitle}>Registro Fotográfico</Text>
                  <View style={s.photoGrid}>
                    {photos.map((photo: string, idx: number) => (
                      <View key={`photo-${idx}`} style={s.photoItem} wrap={false}>
                        <Image src={photo} style={s.photoImg} />
                        {photoCaptions[idx] && (
                          <Text style={s.photoCaption}>{photoCaptions[idx]}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {resident && (
                <View wrap={false} style={{ marginTop: 10 }}>
                  <Text style={s.sectionTitle}>Realizada Por</Text>
                  {resident.signature_url && (
                    <Image src={resident.signature_url} style={s.signatureImg} />
                  )}
                  <Text style={s.signatureName}>{resident.full_name || resident.email}</Text>
                  {resident.role && <Text style={s.signatureDetail}>{resident.role}</Text>}
                  {resident.professional_license && (
                    <Text style={s.signatureDetail}>Licencia: {resident.professional_license}</Text>
                  )}
                  {resident.phone && <Text style={s.signatureDetail}>Tel: {resident.phone}</Text>}
                  {resident.email && <Text style={s.signatureDetail}>{resident.email}</Text>}
                </View>
              )}
            </View>
          </Page>
        )
      })}
    </Document>
  )
}
