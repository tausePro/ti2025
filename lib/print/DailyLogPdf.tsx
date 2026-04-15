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
  docType: {
    fontSize: 8,
    letterSpacing: 2.5,
    color: '#689F38',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#8BC34A',
    paddingBottom: 5,
  },
  docSubtitle: {
    fontSize: 10.5,
    color: '#444',
    marginBottom: 2,
  },
  docHeader: {
    marginBottom: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  infoItem: {
    width: '50%',
    paddingVertical: 3,
    paddingRight: 10,
  },
  infoLabel: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888',
    fontWeight: 'medium',
  },
  infoValue: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#4a7c10',
    borderLeftWidth: 3,
    borderLeftColor: '#8BC34A',
    paddingLeft: 7,
    marginBottom: 5,
    marginTop: 10,
  },
  sectionContent: {
    fontSize: 10,
    lineHeight: 1.55,
    color: '#333',
    textAlign: 'justify',
    marginBottom: 8,
  },
  checkGroup: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 3,
    marginBottom: 8,
  },
  checkHeader: {
    backgroundColor: '#f5f5f5',
    padding: '4 8',
    fontWeight: 'bold',
    fontSize: 9,
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
    fontSize: 9,
  },
  checkDesc: {
    flex: 1,
    color: '#333',
    fontWeight: 'medium',
  },
  statusOk: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    padding: '1 5',
    borderRadius: 2,
  },
  statusFail: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#c62828',
    backgroundColor: '#ffebee',
    padding: '1 5',
    borderRadius: 2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: '48%',
    marginBottom: 6,
  },
  photoImg: {
    width: '100%',
    maxHeight: 180,
    objectFit: 'contain',
    borderWidth: 0.5,
    borderColor: '#ddd',
    borderRadius: 2,
  },
  photoCaption: {
    fontSize: 7.5,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  signatureName: {
    fontWeight: 'bold',
    fontSize: 10.5,
    color: '#222',
  },
  signatureDetail: {
    fontSize: 8.5,
    color: '#666',
    lineHeight: 1.4,
  },
  signatureImg: {
    width: 100,
    height: 42,
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

interface DailyLogPdfProps {
  log: any
  project: any
  assignedProfile: any
  residentProfile: any
  customFieldLabels: Record<string, string>
  membreteSrc: string
}

export function DailyLogPdf({
  log,
  project,
  assignedProfile,
  residentProfile,
  customFieldLabels,
  membreteSrc,
}: DailyLogPdfProps) {
  const elaboradoPor =
    assignedProfile?.full_name ||
    assignedProfile?.email ||
    log.created_by_profile?.full_name ||
    'Usuario'

  const dateFormatted = formatDateValue(log.date, 'es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const textSections = [
    { label: 'Actividades Realizadas', content: log.activities },
    { label: 'Materiales Utilizados', content: log.materials },
    { label: 'Equipos Utilizados', content: log.equipment },
    { label: 'Observaciones', content: log.observations },
    { label: 'Problemas Encontrados', content: log.issues },
    { label: 'Recomendaciones', content: log.recommendations },
  ].filter((sec) => sec.content)

  const customFields = Object.entries({ ...(log.custom_fields || {}) }).filter(
    ([key]) =>
      !['checklists', '_field_labels', 'photo_count', 'photo_captions', 'work_front', 'element'].includes(key)
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

  return (
    <Document
      title={`Bitácora - ${project?.name || ''} - ${log.date}`}
      author="Talento Inmobiliario"
      creator="TausePro"
    >
      <Page size="LETTER" style={s.page}>
        <View style={s.bg} fixed>
          <Image src={membreteSrc} style={{ width: LETTER_W, height: LETTER_H }} />
        </View>

        <View style={s.body}>
          {/* Encabezado */}
          <View style={s.docHeader}>
            <Text style={s.docType}>Reporte Diario</Text>
            <Text style={s.docTitle}>Bitácora de Obra</Text>
            <Text style={s.docSubtitle}>
              <Text style={{ fontWeight: 'bold' }}>Proyecto: </Text>
              {project?.name || ''}
            </Text>
            <Text style={s.docSubtitle}>
              <Text style={{ fontWeight: 'bold' }}>Fecha: </Text>
              {dateFormatted}
            </Text>
          </View>

          {/* Info general */}
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
              <Text style={s.infoLabel}>Personal en Obra</Text>
              <Text style={s.infoValue}>{log.personnel_count ?? 0} personas</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Elaborado por</Text>
              <Text style={s.infoValue}>{elaboradoPor}</Text>
            </View>
          </View>

          {/* Frente de trabajo / Elemento */}
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

          {/* Secciones de texto */}
          {textSections.map((sec) => (
            <View key={sec.label} wrap={false}>
              <Text style={s.sectionTitle}>{sec.label}</Text>
              <Text style={s.sectionContent}>{stripHtml(sec.content)}</Text>
            </View>
          ))}

          {/* Campos personalizados */}
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

          {/* Checklist */}
          {checklistSections.length > 0 && (
            <View>
              <Text style={s.sectionTitle}>Checklist de Verificación</Text>
              {checklistSections.map((section: any) => (
                <View key={section.id} style={s.checkGroup} wrap={false}>
                  <Text style={s.checkHeader}>{section.title}</Text>
                  {(section.items || []).map((item: any) => (
                    <View key={item.id} style={s.checkItem}>
                      <Text style={s.checkDesc}>{item.description}</Text>
                      <Text
                        style={
                          item.status === 'compliant' ? s.statusOk : s.statusFail
                        }
                      >
                        {item.status === 'compliant' ? 'Cumple' : 'No cumple'}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Fotos */}
          {photos.length > 0 && (
            <View>
              <Text style={s.sectionTitle}>Registro Fotográfico</Text>
              <View style={s.photoGrid}>
                {photos.map((photo: string, index: number) => (
                  <View key={`photo-${index}`} style={s.photoItem} wrap={false}>
                    <Image src={photo} style={s.photoImg} />
                    {photoCaptions[index] && (
                      <Text style={s.photoCaption}>{photoCaptions[index]}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Firma */}
          {residentProfile && (
            <View wrap={false} style={{ marginTop: 14 }}>
              <Text style={s.sectionTitle}>Realizada Por</Text>
              {residentProfile.signature_url && (
                <Image src={residentProfile.signature_url} style={s.signatureImg} />
              )}
              <Text style={s.signatureName}>
                {residentProfile.full_name || residentProfile.email}
              </Text>
              {residentProfile.role && (
                <Text style={s.signatureDetail}>{residentProfile.role}</Text>
              )}
              {residentProfile.professional_license && (
                <Text style={s.signatureDetail}>
                  Licencia: {residentProfile.professional_license}
                </Text>
              )}
              {residentProfile.phone && (
                <Text style={s.signatureDetail}>Tel: {residentProfile.phone}</Text>
              )}
              {residentProfile.email && (
                <Text style={s.signatureDetail}>{residentProfile.email}</Text>
              )}
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}
