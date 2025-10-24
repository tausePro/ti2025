import { StyleSheet } from '@react-pdf/renderer'
import type { StylesConfig } from '@/types/reports'

/**
 * Genera estilos dinámicos basados en la configuración de la plantilla
 */
export const createPDFStyles = (config?: Partial<StylesConfig>) => {
  const primaryColor = config?.primary_color || '#2563eb'
  const secondaryColor = config?.secondary_color || '#10b981'
  const accentColor = config?.accent_color || '#f59e0b'
  const fontFamily = config?.font_family || 'Helvetica'

  return StyleSheet.create({
    // ============================================
    // PÁGINA
    // ============================================
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: config?.margins?.top || 40,
      paddingBottom: config?.margins?.bottom || 40,
      paddingLeft: config?.margins?.left || 40,
      paddingRight: config?.margins?.right || 40,
      fontFamily: fontFamily,
      fontSize: 10,
      lineHeight: 1.5,
    },

    // ============================================
    // ENCABEZADO Y PIE
    // ============================================
    header: {
      marginBottom: 20,
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
    },

    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 8,
      color: '#6b7280',
    },

    // ============================================
    // TIPOGRAFÍA
    // ============================================
    h1: {
      fontSize: 24,
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: 10,
    },

    h2: {
      fontSize: 18,
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: 8,
      marginTop: 15,
    },

    h3: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: 6,
      marginTop: 10,
    },

    h4: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#374151',
      marginBottom: 4,
    },

    text: {
      fontSize: 10,
      color: '#1f2937',
      lineHeight: 1.5,
    },

    textSmall: {
      fontSize: 8,
      color: '#6b7280',
    },

    textBold: {
      fontWeight: 'bold',
    },

    textItalic: {
      fontStyle: 'italic',
    },

    // ============================================
    // LAYOUT
    // ============================================
    section: {
      marginBottom: 20,
    },

    row: {
      flexDirection: 'row',
      marginBottom: 8,
    },

    column: {
      flexDirection: 'column',
      flex: 1,
    },

    spaceBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    // ============================================
    // CONTENEDORES
    // ============================================
    card: {
      backgroundColor: '#f9fafb',
      borderRadius: 4,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },

    cardHeader: {
      backgroundColor: primaryColor,
      color: '#ffffff',
      padding: 8,
      marginBottom: 8,
      borderRadius: 4,
    },

    // ============================================
    // TABLAS
    // ============================================
    table: {
      width: '100%',
      marginBottom: 15,
    },

    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primaryColor,
      color: '#ffffff',
      padding: 8,
      fontWeight: 'bold',
      fontSize: 9,
    },

    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      padding: 6,
      fontSize: 9,
    },

    tableRowAlt: {
      flexDirection: 'row',
      backgroundColor: '#f9fafb',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      padding: 6,
      fontSize: 9,
    },

    tableCell: {
      flex: 1,
      padding: 4,
    },

    // ============================================
    // BADGES Y ESTADOS
    // ============================================
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 8,
      fontWeight: 'bold',
      alignSelf: 'flex-start',
    },

    badgeSuccess: {
      backgroundColor: '#dcfce7',
      color: '#166534',
    },

    badgeWarning: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
    },

    badgeError: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
    },

    badgeInfo: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },

    badgeNeutral: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
    },

    // ============================================
    // IMÁGENES
    // ============================================
    image: {
      maxWidth: '100%',
      maxHeight: 200,
      objectFit: 'contain',
      marginBottom: 8,
    },

    imageSmall: {
      maxWidth: 100,
      maxHeight: 100,
      objectFit: 'cover',
      marginRight: 8,
      marginBottom: 8,
    },

    imageLarge: {
      maxWidth: '100%',
      maxHeight: 400,
      objectFit: 'contain',
      marginBottom: 12,
    },

    // ============================================
    // GRID DE FOTOS
    // ============================================
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 15,
    },

    photoGridItem: {
      width: '48%',
      marginBottom: 8,
    },

    photoCaption: {
      fontSize: 8,
      color: '#6b7280',
      marginTop: 4,
      textAlign: 'center',
    },

    // ============================================
    // LISTAS
    // ============================================
    list: {
      marginBottom: 10,
    },

    listItem: {
      flexDirection: 'row',
      marginBottom: 4,
    },

    listBullet: {
      width: 15,
      fontSize: 10,
      color: primaryColor,
    },

    listContent: {
      flex: 1,
      fontSize: 10,
      color: '#1f2937',
    },

    // ============================================
    // FIRMAS
    // ============================================
    signatureContainer: {
      marginTop: 30,
      flexDirection: 'row',
      justifyContent: 'space-around',
    },

    signatureBox: {
      width: '40%',
      alignItems: 'center',
    },

    signatureLine: {
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: '#000000',
      marginBottom: 5,
    },

    signatureName: {
      fontSize: 10,
      fontWeight: 'bold',
      marginBottom: 2,
    },

    signatureRole: {
      fontSize: 8,
      color: '#6b7280',
    },

    // ============================================
    // PORTADA
    // ============================================
    coverPage: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 60,
    },

    coverTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: primaryColor,
      textAlign: 'center',
      marginBottom: 20,
    },

    coverSubtitle: {
      fontSize: 18,
      color: '#6b7280',
      textAlign: 'center',
      marginBottom: 40,
    },

    coverLogo: {
      width: 150,
      height: 150,
      marginBottom: 30,
    },

    // ============================================
    // UTILIDADES
    // ============================================
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      marginVertical: 10,
    },

    dividerThick: {
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      marginVertical: 15,
    },

    mt10: { marginTop: 10 },
    mt20: { marginTop: 20 },
    mb10: { marginBottom: 10 },
    mb20: { marginBottom: 20 },
    p10: { padding: 10 },
    p20: { padding: 20 },
  })
}

/**
 * Estilos por defecto
 */
export const defaultStyles = createPDFStyles()
