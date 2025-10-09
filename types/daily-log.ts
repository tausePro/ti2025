// Tipos para bitácoras diarias

export type ChecklistItemStatus = 'compliant' | 'non_compliant' | 'not_applicable' | null

export interface ChecklistItem {
  id: string
  description: string
  status: ChecklistItemStatus
  observations: string
}

export interface ChecklistSection {
  id: string
  title: string
  items: ChecklistItem[]
}

// Secciones predefinidas de revisión
export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 'pilas_cimentacion',
    title: '1. REVISIÓN DE PILAS DE CIMENTACIÓN',
    items: [
      {
        id: 'pilas_1',
        description: 'Revisión ubicación pila de acuerdo a coordenadas plano arquitectónico',
        status: null,
        observations: ''
      },
      {
        id: 'pilas_2',
        description: 'Profundidad y diámetro según planos y criterio de suelos',
        status: null,
        observations: ''
      },
      {
        id: 'pilas_3',
        description: 'Verificación del tipo de suelo en la excavación',
        status: null,
        observations: ''
      },
      {
        id: 'pilas_4',
        description: 'Presencia de agua en la perforación',
        status: null,
        observations: ''
      },
      {
        id: 'pilas_5',
        description: 'Limpieza de la perforación antes del vaciado',
        status: null,
        observations: ''
      },
      {
        id: 'pilas_6',
        description: 'Correcta colocación y amarre del acero de la canasta',
        status: null,
        observations: ''
      },
      {
        id: 'pilas_7',
        description: 'Calidad del concreto (asentamiento y resistencia)',
        status: null,
        observations: ''
      },
      {
        id: 'pilas_8',
        description: 'Tiempo entre perforación y vaciado',
        status: null,
        observations: 'Especificar tiempo en días'
      }
    ]
  },
  {
    id: 'losa_concreto',
    title: '2. REVISIÓN DE LOSA DE CONCRETO',
    items: [
      {
        id: 'losa_1',
        description: 'Espesor de la losa según planos',
        status: null,
        observations: ''
      },
      {
        id: 'losa_2',
        description: 'Secciones de vigas y nervios similares con el diseño estructural',
        status: null,
        observations: ''
      },
      {
        id: 'losa_3',
        description: 'Verificación de acero de refuerzo (diámetro y distribución) vigas, nervios y losa',
        status: null,
        observations: ''
      },
      {
        id: 'losa_4',
        description: 'Verificación de acero de refuerzo (diámetro y distribución) pasos',
        status: null,
        observations: ''
      },
      {
        id: 'losa_5',
        description: 'Colocación de separadores y recubrimiento adecuado',
        status: null,
        observations: ''
      },
      {
        id: 'losa_6',
        description: 'Correcta instalación de tuberías eléctricas y sanitarias embebidas',
        status: null,
        observations: ''
      },
      {
        id: 'losa_7',
        description: 'Revisión de distancias bocas losa de acuerdo a planos arquitectónicos',
        status: null,
        observations: ''
      },
      {
        id: 'losa_8',
        description: 'Calidad del concreto (asentamiento y resistencia)',
        status: null,
        observations: ''
      },
      {
        id: 'losa_9',
        description: 'Nivelación y acabado superficial',
        status: null,
        observations: ''
      }
    ]
  },
  {
    id: 'columnas',
    title: '3. REVISIÓN DE COLUMNAS',
    items: [
      {
        id: 'columnas_1',
        description: 'Ubicación de la columna según planos arquitectónicos',
        status: null,
        observations: ''
      },
      {
        id: 'columnas_2',
        description: 'Dimensiones y alineación según planos estructurales',
        status: null,
        observations: ''
      },
      {
        id: 'columnas_3',
        description: 'Amarre y colocación correcta del acero de refuerzo (Acero longitudinal, estribos y ganchos) según planos estructurales',
        status: null,
        observations: ''
      },
      {
        id: 'columnas_4',
        description: 'Recubrimiento del concreto sobre el refuerzo',
        status: null,
        observations: ''
      },
      {
        id: 'columnas_5',
        description: 'Calidad del concreto (asentamiento y resistencia)',
        status: null,
        observations: ''
      },
      {
        id: 'columnas_6',
        description: 'Plomada y verticalidad de la columna',
        status: null,
        observations: ''
      }
    ]
  },
  {
    id: 'muros_concreto',
    title: '4. REVISIÓN DE MUROS DE CONCRETO',
    items: [
      {
        id: 'muros_1',
        description: 'Ubicación del muro según planos arquitectónicos',
        status: null,
        observations: ''
      },
      {
        id: 'muros_2',
        description: 'Altura y espesor de acuerdo con diseño estructural',
        status: null,
        observations: ''
      },
      {
        id: 'muros_3',
        description: 'Verificación de alineación y plomada del muro',
        status: null,
        observations: ''
      },
      {
        id: 'muros_4',
        description: 'Integración del muro con los elementos adyacentes (losa, columnas, cimentación)',
        status: null,
        observations: ''
      },
      {
        id: 'muros_5',
        description: 'Amarre y colocación correcta del acero de refuerzo (Acero longitudinal, estribos y ganchos), según planos estructurales',
        status: null,
        observations: ''
      },
      {
        id: 'muros_6',
        description: 'Correcto traslape y amarre de las varillas',
        status: null,
        observations: ''
      },
      {
        id: 'muros_7',
        description: 'Uso de separadores para garantizar recubrimiento adecuado',
        status: null,
        observations: ''
      },
      {
        id: 'muros_8',
        description: 'Calidad del concreto (asentamiento y resistencia)',
        status: null,
        observations: ''
      },
      {
        id: 'muros_9',
        description: 'Correcto vibrado para evitar segregaciones y huecos',
        status: null,
        observations: ''
      }
    ]
  },
  {
    id: 'mamposteria',
    title: '5. REVISIÓN DE MAMPOSTERÍA ESTRUCTURAL',
    items: [
      {
        id: 'mamposteria_1',
        description: 'Ubicación y alineación del muro según planos arquitectónicos',
        status: null,
        observations: ''
      },
      {
        id: 'mamposteria_2',
        description: 'Dimensiones y tipo de bloques utilizados',
        status: null,
        observations: ''
      },
      {
        id: 'mamposteria_3',
        description: 'Correcta colocación y distribución de refuerzos verticales y horizontales',
        status: null,
        observations: ''
      },
      {
        id: 'mamposteria_4',
        description: 'Anclaje adecuado en losas',
        status: null,
        observations: ''
      },
      {
        id: 'mamposteria_5',
        description: 'Uso de mortero de pega e inyección de acuerdo con los diseños estructurales',
        status: null,
        observations: ''
      },
      {
        id: 'mamposteria_6',
        description: 'Relleno de celdas con concreto donde aplique',
        status: null,
        observations: ''
      },
      {
        id: 'mamposteria_7',
        description: 'Control de fisuras o defectos en la mampostería',
        status: null,
        observations: ''
      },
      {
        id: 'mamposteria_8',
        description: 'Correcta ejecución de juntas de traba y dilatación',
        status: null,
        observations: ''
      }
    ]
  }
]

// Campos base de la bitácora (80%)
export interface DailyLogBaseFields {
  date: string
  weather: 'soleado' | 'nublado' | 'lluvioso' | 'tormentoso'
  temperature?: number
  personnel_count: number
  activities: string
  materials?: string
  equipment?: string
  observations?: string
  issues?: string
  recommendations?: string
}

// Estructura completa de la bitácora
export interface DailyLog extends DailyLogBaseFields {
  id: string
  project_id: string
  template_id: string
  created_by: string
  created_at: string
  updated_at: string
  sync_status: 'pending' | 'syncing' | 'synced' | 'conflict'
  offline_created_at?: string
  last_synced_at?: string
  device_id?: string
  
  // Checklists de revisión
  checklists: ChecklistSection[]
  
  // Fotos
  photos: DailyLogPhoto[]
  
  // Campos custom (20%)
  custom_fields?: Record<string, any>
}

export interface DailyLogPhoto {
  id: string
  url: string
  description?: string
  section?: string // A qué sección pertenece
  uploaded_at: string
}

// Tipo para el formulario
export interface DailyLogFormData extends DailyLogBaseFields {
  checklists: ChecklistSection[]
  photos: File[]
  custom_fields?: Record<string, any>
}
