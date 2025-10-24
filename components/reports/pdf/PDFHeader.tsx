import { View, Text, Image } from '@react-pdf/renderer'
import type { HeaderConfig, ProjectData } from '@/types/reports'
import { createPDFStyles } from './PDFStyles'

interface PDFHeaderProps {
  config: HeaderConfig
  project: ProjectData
  currentDate?: string
}

export function PDFHeader({ config, project, currentDate }: PDFHeaderProps) {
  const styles = createPDFStyles()

  return (
    <View
      style={{
        ...styles.header,
        backgroundColor: config.background_color,
        minHeight: config.height,
        paddingVertical: 10,
        paddingHorizontal: 15,
      }}
      fixed
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        {config.logo_url && (
          <View style={{ width: 80 }}>
            <Image
              src={config.logo_url}
              style={{ maxWidth: 80, maxHeight: 60, objectFit: 'contain' }}
            />
          </View>
        )}

        {/* Información central */}
        <View style={{ flex: 1, marginHorizontal: 15 }}>
          {config.company_name && (
            <Text
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: config.text_color,
                marginBottom: 4,
              }}
            >
              {config.company_name}
            </Text>
          )}

          {config.custom_text && (
            <Text
              style={{
                fontSize: 10,
                color: config.text_color,
                marginBottom: 2,
              }}
            >
              {config.custom_text}
            </Text>
          )}

          {config.show_project_code && (
            <Text
              style={{
                fontSize: 9,
                color: config.text_color,
                opacity: 0.8,
              }}
            >
              Proyecto: {project.project_code} - {project.name}
            </Text>
          )}
        </View>

        {/* Fecha */}
        {config.show_date && currentDate && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 9,
                color: config.text_color,
                opacity: 0.8,
              }}
            >
              {new Date(currentDate).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
