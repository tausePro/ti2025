import Dexie, { Table } from 'dexie'

// Interfaces para datos offline
export interface OfflineProject {
  id: string
  company_id: string
  name: string
  project_code?: string
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
  template_id?: string
  date: string
  time?: string
  weather?: string
  temperature?: string
  personnel_count?: number
  activities?: string
  materials?: string
  equipment?: string
  observations?: string
  issues?: string
  recommendations?: string
  assigned_to?: string
  location?: any
  signatures?: any[]
  custom_fields?: any
  photos?: string[]
  created_by: string
  created_at: string
  updated_at: string
  sync_status: 'pending' | 'syncing' | 'synced' | 'error'
  sync_error?: string
  offline_created: boolean
}

export interface OfflinePhoto {
  id: string
  daily_log_id: string
  filename: string
  original_name?: string
  file_size?: number
  mime_type?: string
  description?: string
  blob_data: Blob
  synced: boolean
  remote_url?: string
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
  max_attempts?: number
}

export interface OfflineConfig {
  id: string
  project_id: string
  config_type: 'daily_log_config' | 'project_users' | 'template'
  data: any
  cached_at: string
}

// Base de datos IndexedDB con Dexie
export class TalentoDatabase extends Dexie {
  projects!: Table<OfflineProject>
  daily_logs!: Table<OfflineDailyLog>
  photos!: Table<OfflinePhoto>
  sync_queue!: Table<SyncQueue>
  offline_configs!: Table<OfflineConfig>

  constructor() {
    super('TalentoInmobiliarioDB')
    
    this.version(1).stores({
      projects: 'id, company_id, name, status, synced',
      daily_logs: 'id, project_id, date, created_by, synced',
      photos: 'id, daily_log_id, filename, synced',
      sync_queue: '++id, table_name, record_id, operation, created_at'
    })

    this.version(2).stores({
      projects: 'id, company_id, name, status, synced',
      daily_logs: 'id, project_id, date, created_by, sync_status, offline_created',
      photos: 'id, daily_log_id, synced',
      sync_queue: '++id, table_name, record_id, operation, created_at, attempts',
      offline_configs: 'id, project_id, config_type, cached_at'
    })
  }
}

export const db = new TalentoDatabase()
