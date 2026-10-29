export type ReleaseRole =
  | 'super_admin'
  | 'admin'
  | 'gerente'
  | 'supervisor'
  | 'residente'
  | 'cliente'

export interface GuidedTourStep {
  id: string
  version: string
  moduleBadge: string
  title: string
  description: string
  highlights: string[]
  targetNavHref?: string
  ctaLabel?: string
  ctaHref?: string
  roles: ReleaseRole[]
}

export interface ReleaseInfo {
  version: string
  releaseDate: string
  toastTitle: string
  toastDescription: string
  steps: GuidedTourStep[]
}

export const CURRENT_RELEASE_VERSION = 'v0.0.24'

export const CURRENT_RELEASE: ReleaseInfo = {
  version: CURRENT_RELEASE_VERSION,
  releaseDate: '2026-10-29',
  toastTitle: `Plataforma actualizada (${CURRENT_RELEASE_VERSION})`,
  toastDescription:
    'Hay nuevas mejoras en Bitácoras, Informe Quincenal y Control de Calidad. Haz el recorrido rápido para conocerlas.',
  steps: [
    {
      id: 'shared-daily-logs',
      version: 'v0.0.22',
      moduleBadge: 'Bitácora Diaria',
      title: 'Bitácoras compartidas entre residentes del mismo proyecto',
      description:
        'Todos los residentes asignados a un proyecto ahora pueden consultar las bitácoras registradas por sus compañeros en ese proyecto para consolidar la información de obra sin duplicar esfuerzos.',
      highlights: [
        'Consulta en modo lectura de todas las bitácoras del proyecto asignado.',
        'La edición y eliminación se mantienen exclusivas para el autor de cada bitácora.',
        'Soporte offline-first, videos adjuntos y exportación de PDF por rango de fechas.'
      ],
      targetNavHref: '/projects',
      ctaLabel: 'Ir a Proyectos',
      ctaHref: '/projects',
      roles: ['super_admin', 'admin', 'gerente', 'supervisor', 'residente']
    },
    {
      id: 'biweekly-report-stage1',
      version: 'v0.0.23',
      moduleBadge: 'Informe Quincenal',
      title: 'Informe Quincenal Etapa 1: conclusiones y curaduría de fotos',
      description:
        'El informe quincenal ahora aprovecha directamente las observaciones, novedades, recomendaciones y fotografías capturadas en la bitácora diaria durante el período.',
      highlights: [
        'Placeholders automáticos de conclusiones alimentados desde las bitácoras del período.',
        'Curador de fotografías para elegir, ordenar y editar el pie de cada imagen sin límite artificial.',
        'Congelamiento de fuente al enviar a revisión y alerta automática si una bitácora incluida cambia después.'
      ],
      targetNavHref: '/reports/biweekly',
      ctaLabel: 'Ver Informes Quincenales',
      ctaHref: '/reports/biweekly',
      roles: ['super_admin', 'admin', 'gerente', 'supervisor', 'residente']
    },
    {
      id: 'quality-control-formats',
      version: 'v0.0.21',
      moduleBadge: 'Control de Calidad',
      title: 'Nuevos formatos de ensayo y evaluación automática',
      description:
        'Se ampliaron las plantillas de Control de Calidad con evaluación automática por probeta individual, edad decisiva y soporte de evidencias fotográficas en el PDF.',
      highlights: [
        'Concreto en MPa con edad opcional a 56 días y veredicto por cilindro individual.',
        'Acero NTC-2289 (físico y químico de colada) y mallas electrosoldadas NTC-5806 (D-50 a D-335).',
        'Morteros de pega, muretes y unidades de mampostería según especificación del proyecto.',
        'Pruebas de presurización (agua/gas) y estanqueidad con fotos de manómetro al inicio y a 24h.',
        'Control de avance de pilas comparando volumen teórico calculado contra volumen real vaciado.'
      ],
      targetNavHref: '/quality-control',
      ctaLabel: 'Abrir Control de Calidad',
      ctaHref: '/quality-control',
      roles: ['super_admin', 'admin', 'gerente', 'supervisor', 'residente']
    },
    {
      id: 'quality-templates-admin',
      version: 'v0.0.21',
      moduleBadge: 'Administración',
      title: 'Administración visual de plantillas de calidad',
      description:
        'Los administradores pueden crear y ajustar formatos de ensayo, campos personalizados, fórmulas y criterios de aceptación directamente desde el panel sin migraciones manuales.',
      highlights: [
        'Configuración de campos personalizados, unidades dinámicas y campos calculados.',
        'Definición de períodos de ensayo o ensayos nombrados con criterios por operador o rango.',
        'Activación y edición inmediata para nuevos registros de muestras.'
      ],
      targetNavHref: '/admin/quality-templates',
      ctaLabel: 'Gestionar Plantillas de Calidad',
      ctaHref: '/admin/quality-templates',
      roles: ['super_admin', 'admin']
    },
    {
      id: 'client-published-reports',
      version: 'v0.0.23',
      moduleBadge: 'Informes de Proyecto',
      title: 'Consulta de informes quincenales publicados',
      description:
        'Los informes quincenales aprobados y firmados por supervisión y gerencia quedan disponibles con su registro fotográfico completo y conclusiones consolidadas del período.',
      highlights: [
        'Acceso directo a los informes publicados de tus proyectos activos.',
        'Visualización e impresión en PDF con membrete institucional y anexos fotográficos.'
      ],
      targetNavHref: '/reports',
      ctaLabel: 'Ver Informes',
      ctaHref: '/reports',
      roles: ['cliente']
    }
  ]
}

export function getTourStepsForRole(
  role?: string | null,
  release: ReleaseInfo = CURRENT_RELEASE
): GuidedTourStep[] {
  const normalizedRole = (role || 'residente') as ReleaseRole
  const filtered = release.steps.filter((step) => step.roles.includes(normalizedRole))
  return filtered.length > 0 ? filtered : release.steps.slice(0, 3)
}

export function getReleaseStorageKey(version: string, userId?: string | null): string {
  const suffix = userId ? userId : 'anon'
  return `ti_release_tour_seen_${version}_${suffix}`
}

export function getReleaseToastDismissedKey(version: string, userId?: string | null): string {
  const suffix = userId ? userId : 'anon'
  return `ti_release_toast_dismissed_${version}_${suffix}`
}
