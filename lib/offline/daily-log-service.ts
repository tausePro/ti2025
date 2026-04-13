import { db, OfflineDailyLog, OfflinePhoto, OfflineConfig } from '@/lib/db/schema'

// Generar un ID único para registros offline
function generateId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================
// GUARDAR BITÁCORA (offline-first)
// ============================================================

export interface SaveDailyLogParams {
  id?: string // Si es edición
  project_id: string
  template_id?: string
  created_by: string
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
  assigned_to?: string | null
  location?: any
  signatures?: any[]
  custom_fields?: any
  photos?: string[]
}

export async function saveLocalDailyLog(
  params: SaveDailyLogParams,
  isNew: boolean
): Promise<OfflineDailyLog> {
  const now = new Date().toISOString()
  const id = isNew ? generateId() : params.id!

  const record: OfflineDailyLog = {
    id,
    project_id: params.project_id,
    template_id: params.template_id,
    date: params.date,
    time: params.time,
    weather: params.weather,
    temperature: params.temperature,
    personnel_count: params.personnel_count,
    activities: params.activities,
    materials: params.materials,
    equipment: params.equipment,
    observations: params.observations,
    issues: params.issues,
    recommendations: params.recommendations,
    assigned_to: params.assigned_to || undefined,
    location: params.location,
    signatures: params.signatures,
    custom_fields: params.custom_fields,
    photos: params.photos || [],
    created_by: params.created_by,
    created_at: isNew ? now : (await getLocalDailyLog(id))?.created_at || now,
    updated_at: now,
    sync_status: 'pending',
    sync_error: undefined,
    offline_created: isNew,
  }

  await db.daily_logs.put(record)

  // Encolar operación de sincronización
  await db.sync_queue.add({
    table_name: 'daily_logs',
    record_id: id,
    operation: isNew ? 'create' : 'update',
    data: record,
    created_at: now,
    attempts: 0,
    max_attempts: 5,
  })

  return record
}

// ============================================================
// GUARDAR FOTOS OFFLINE
// ============================================================

export async function saveLocalPhoto(
  dailyLogId: string,
  file: File
): Promise<OfflinePhoto> {
  const id = generateId()
  const blob = new Blob([await file.arrayBuffer()], { type: file.type })

  const record: OfflinePhoto = {
    id,
    daily_log_id: dailyLogId,
    filename: `${Date.now()}_${file.name}`,
    original_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    blob_data: blob,
    synced: false,
  }

  await db.photos.put(record)
  return record
}

export async function getLocalPhotos(dailyLogId: string): Promise<OfflinePhoto[]> {
  return db.photos.where('daily_log_id').equals(dailyLogId).toArray()
}

export async function clearLocalPendingPhotos(dailyLogId: string): Promise<void> {
  const localPhotos = await getLocalPhotos(dailyLogId)
  const pendingPhotoIds = localPhotos
    .filter(photo => !photo.remote_url)
    .map(photo => photo.id)

  if (pendingPhotoIds.length === 0) {
    return
  }

  await db.photos.bulkDelete(pendingPhotoIds)
}

export async function replaceLocalPendingPhotos(
  dailyLogId: string,
  files: File[]
): Promise<OfflinePhoto[]> {
  await clearLocalPendingPhotos(dailyLogId)

  const savedPhotos: OfflinePhoto[] = []

  for (const file of files) {
    savedPhotos.push(await saveLocalPhoto(dailyLogId, file))
  }

  return savedPhotos
}

export async function getLocalPhotoAsUrl(photo: OfflinePhoto): Promise<string> {
  if (photo.remote_url) return photo.remote_url
  return URL.createObjectURL(photo.blob_data)
}

// ============================================================
// LEER BITÁCORAS LOCALES
// ============================================================

export async function getLocalDailyLog(id: string): Promise<OfflineDailyLog | undefined> {
  return db.daily_logs.get(id)
}

export async function getLocalDailyLogsByProject(projectId: string): Promise<OfflineDailyLog[]> {
  return db.daily_logs
    .where('project_id')
    .equals(projectId)
    .reverse()
    .sortBy('date')
}

export async function getAllPendingLogs(): Promise<OfflineDailyLog[]> {
  return db.daily_logs
    .where('sync_status')
    .anyOf(['pending', 'error'])
    .toArray()
}

// ============================================================
// CACHEAR DATOS DE SUPABASE EN LOCAL
// ============================================================

export async function cacheDailyLogsFromRemote(
  projectId: string,
  remoteLogs: any[]
): Promise<void> {
  await db.transaction('rw', db.daily_logs, async () => {
    for (const log of remoteLogs) {
      const existing = await db.daily_logs.get(log.id)
      // No sobreescribir registros locales pendientes de sync
      if (existing && existing.sync_status === 'pending') continue
      
      await db.daily_logs.put({
        id: log.id,
        project_id: log.project_id,
        template_id: log.template_id,
        date: log.date,
        time: log.time,
        weather: log.weather,
        temperature: log.temperature,
        personnel_count: log.personnel_count,
        activities: log.activities,
        materials: log.materials,
        equipment: log.equipment,
        observations: log.observations,
        issues: log.issues,
        recommendations: log.recommendations,
        assigned_to: log.assigned_to,
        location: log.location,
        signatures: log.signatures,
        custom_fields: log.custom_fields,
        photos: log.photos || [],
        created_by: log.created_by,
        created_at: log.created_at,
        updated_at: log.updated_at,
        sync_status: 'synced',
        offline_created: false,
      })
    }
  })
}

// ============================================================
// CACHEAR CONFIGURACIÓN DE PROYECTO
// ============================================================

export async function cacheProjectConfig(
  projectId: string,
  configType: OfflineConfig['config_type'],
  data: any
): Promise<void> {
  const id = `${projectId}_${configType}`
  await db.offline_configs.put({
    id,
    project_id: projectId,
    config_type: configType,
    data,
    cached_at: new Date().toISOString(),
  })
}

export async function getCachedProjectConfig(
  projectId: string,
  configType: OfflineConfig['config_type']
): Promise<any | null> {
  const id = `${projectId}_${configType}`
  const config = await db.offline_configs.get(id)
  return config?.data || null
}

// ============================================================
// COLA DE SINCRONIZACIÓN
// ============================================================

export async function getPendingSyncCount(): Promise<number> {
  return db.sync_queue.count()
}

export async function getPendingSyncOperations() {
  return db.sync_queue.orderBy('created_at').toArray()
}

export async function removeSyncOperation(id: number): Promise<void> {
  await db.sync_queue.delete(id)
}

export async function incrementSyncAttempt(id: number, error: string): Promise<void> {
  const op = await db.sync_queue.get(id)
  if (!op) return
  
  await db.sync_queue.update(id, {
    attempts: op.attempts + 1,
    last_error: error,
  })

  // Actualizar el estado del registro relacionado
  if (op.table_name === 'daily_logs') {
    await db.daily_logs.update(op.record_id, {
      sync_status: 'error',
      sync_error: error,
    })
  }
}

export async function markDailyLogSynced(
  localId: string,
  remoteId: string,
  remoteData: any
): Promise<void> {
  await db.transaction('rw', db.daily_logs, async () => {
    // Si el ID cambió (offline → remote), eliminar el local y crear con el remoto
    if (localId !== remoteId) {
      await db.daily_logs.delete(localId)
    }

    await db.daily_logs.put({
      ...remoteData,
      id: remoteId,
      sync_status: 'synced',
      sync_error: undefined,
      offline_created: false,
    })
  })

  // Actualizar las fotos asociadas con el nuevo ID
  if (localId !== remoteId) {
    const photos = await db.photos.where('daily_log_id').equals(localId).toArray()
    for (const photo of photos) {
      await db.photos.update(photo.id, { daily_log_id: remoteId })
    }
  }
}
