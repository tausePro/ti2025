import Dexie, { Table } from 'dexie'

// Interfaces para datos offline
export interface OfflineProject {
  id: string
  company_id: string
  name: string
  address: string
  intervention_type: string[]
  status: string
  custom_fields_config: any
  created_at: string
  updated_at: string
  synced: boolean
}

export interface OfflineDailyLog {
  id: string
  project_id: string
  date: string
  weather?: string
  temperature?: string
  personnel_count?: number
  activities?: string
  materials?: string
  equipment?: string
  observations?: string
  issues?: string
  recommendations?: string
  custom_fields?: any
  created_by: string
  created_at: string
  updated_at: string
  synced: boolean
}

export interface OfflinePhoto {
  id: string
  daily_log_id: string
  filename: string
  original_name?: string
  file_path?: string
  file_size?: number
  mime_type?: string
  tags?: string[]
  description?: string
  location_lat?: number
  location_lng?: number
  taken_at?: string
  blob_data?: Blob // Para almacenar la imagen offline
  synced: boolean
}

export interface SyncQueue {
  id?: number
  table_name: string
  record_id: string
  operation: 'create' | 'update' | 'delete'
  data: any
  created_at: string
  attempts: number
  last_error?: string
}

// Base de datos IndexedDB con Dexie
export class TalentoDatabase extends Dexie {
  projects!: Table<OfflineProject>
  daily_logs!: Table<OfflineDailyLog>
  photos!: Table<OfflinePhoto>
  sync_queue!: Table<SyncQueue>

  constructor() {
    super('TalentoInmobiliarioDB')
    
    this.version(1).stores({
      projects: 'id, company_id, name, status, synced',
      daily_logs: 'id, project_id, date, created_by, synced',
      photos: 'id, daily_log_id, filename, synced',
      sync_queue: '++id, table_name, record_id, operation, created_at'
    })
  }
}

export const db = new TalentoDatabase()
