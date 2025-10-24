import { View, Text } from '@react-pdf/renderer'
import type { FooterConfig } from '@/types/reports'
import { createPDFStyles } from './PDFStyles'

interface PDFFooterProps {
  config: FooterConfig
  pageNumber?: number
  totalPages?: number
  generatedDate?: string
}

export function PDFFooter({ config, pageNumber, totalPages, generatedDate }: PDFFooterProps) {
  const styles = createPDFStyles()

  return (
    <View
      style={{
        ...styles.footer,
        minHeight: config.height,
        color: config.text_color,
      }}
      fixed
    >
      {/* Texto personalizado */}
      <View style={{ flex: 1 }}>
        {config.custom_text && (
          <Text style={{ fontSize: 8 }}>{config.custom_text}</Text>
        )}
      </View>

      {/* Centro: Fecha de generación */}
      {config.show_generation_date && generatedDate && (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 8 }}>
            Generado: {new Date(generatedDate).toLocaleDateString('es-ES')}
          </Text>
        </View>
      )}

      {/* Derecha: Número de página */}
      {config.show_page_numbers && (
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text
            style={{ fontSize: 8 }}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      )}
    </View>
  )
}
