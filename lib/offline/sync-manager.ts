import { db, OfflinePhoto, SyncQueue } from '@/lib/db/schema'
import {
  getPendingSyncOperations,
  removeSyncOperation,
  incrementSyncAttempt,
  markDailyLogSynced,
  getLocalPhotos,
} from './daily-log-service'
import { createClient } from '@/lib/supabase/client'

const MAX_ATTEMPTS = 5
let isSyncing = false

export type SyncEventType = 'sync_start' | 'sync_complete' | 'sync_error' | 'sync_progress'

export interface SyncEvent {
  type: SyncEventType
  total?: number
  completed?: number
  failed?: number
  error?: string
}

type SyncListener = (event: SyncEvent) => void
const listeners: Set<SyncListener> = new Set()

export function onSyncEvent(listener: SyncListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(event: SyncEvent) {
  listeners.forEach(fn => fn(event))
}

// ============================================================
// SINCRONIZACIÓN PRINCIPAL
// ============================================================

export async function runSync(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 }
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  isSyncing = true
  let synced = 0
  let failed = 0

  try {
    const operations = await getPendingSyncOperations()
    if (operations.length === 0) {
      isSyncing = false
      return { synced: 0, failed: 0 }
    }

    emit({ type: 'sync_start', total: operations.length })

    for (const op of operations) {
      if (!navigator.onLine) break
      if (op.attempts >= (op.max_attempts || MAX_ATTEMPTS)) {
        failed++
        continue
      }

      try {
        await syncOperation(op)
        await removeSyncOperation(op.id!)
        synced++
        emit({ type: 'sync_progress', total: operations.length, completed: synced, failed })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        await incrementSyncAttempt(op.id!, errorMsg)
        failed++
        emit({ type: 'sync_error', error: errorMsg })
      }
    }

    emit({ type: 'sync_complete', total: operations.length, completed: synced, failed })
  } finally {
    isSyncing = false
  }

  return { synced, failed }
}

// ============================================================
// PROCESAR UNA OPERACIÓN
// ============================================================

async function syncOperation(op: SyncQueue): Promise<void> {
  const supabase = createClient()

  switch (op.table_name) {
    case 'daily_logs':
      await syncDailyLog(supabase, op)
      break
    case 'photos':
      await syncPhoto(supabase, op)
      break
    default:
      throw new Error(`Tabla no soportada para sync: ${op.table_name}`)
  }
}

// ============================================================
// SYNC FOTO INDIVIDUAL (desde sync_queue)
// ============================================================

async function syncPhoto(supabase: any, op: SyncQueue): Promise<void> {
  const photoData = op.data as OfflinePhoto
  if (!photoData?.blob_data || !photoData.daily_log_id) {
    throw new Error('Datos de foto incompletos para sync')
  }

  const fileExt = photoData.original_name?.split('.').pop() || 'jpg'
  const fileName = `offline/${photoData.daily_log_id}/${Date.now()}_${photoData.id}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('daily-logs-photos')
    .upload(fileName, photoData.blob_data, {
      contentType: photoData.mime_type || 'image/jpeg',
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('daily-logs-photos')
    .getPublicUrl(fileName)

  await db.photos.update(photoData.id, {
    synced: true,
    remote_url: publicUrl,
  })
}

// ============================================================
// SYNC BITÁCORA
// ============================================================

async function syncDailyLog(supabase: any, op: SyncQueue): Promise<void> {
  const localLog = op.data

  // Limpiar campos que no existen en Supabase
  const { sync_status, sync_error, offline_created, ...cleanData } = localLog

  // Limpiar el ID offline si fue creado localmente
  const isOfflineId = cleanData.id?.startsWith('offline_')

  if (op.operation === 'create') {
    const insertData = { ...cleanData }
    if (isOfflineId) {
      delete insertData.id // Dejar que Supabase genere el UUID
    }

    const { data, error } = await supabase
      .from('daily_logs')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // Actualizar registro local con datos remotos
    await markDailyLogSynced(localLog.id, data.id, data)

    // Sincronizar fotos asociadas
    await syncPhotosForLog(supabase, localLog.id, data.id, data.created_by, data.project_id)

  } else if (op.operation === 'update') {
    if (isOfflineId) {
      throw new Error('No se puede actualizar un registro que no existe en el servidor')
    }

    const { id, created_by, created_at, ...updateData } = cleanData

    const { data, error } = await supabase
      .from('daily_logs')
      .update({ ...updateData, sync_status: 'synced' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    await markDailyLogSynced(id, id, data)
  }
}

// ============================================================
// SYNC FOTOS
// ============================================================

async function syncPhotosForLog(
  supabase: any,
  localLogId: string,
  remoteLogId: string,
  userId: string,
  projectId: string
): Promise<void> {
  const pendingPhotos = await getLocalPhotos(localLogId)
  const unsyncedPhotos = pendingPhotos.filter(p => !p.synced)

  if (unsyncedPhotos.length === 0) return

  const photoUrls: string[] = []

  for (let i = 0; i < unsyncedPhotos.length; i++) {
    const photo = unsyncedPhotos[i]

    try {
      const fileExt = photo.original_name?.split('.').pop() || 'jpg'
      const fileName = `${userId}/${projectId}/${remoteLogId}/${Date.now()}_${i}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('daily-logs-photos')
        .upload(fileName, photo.blob_data, {
          contentType: photo.mime_type || 'image/jpeg',
        })

      if (uploadError) {
        console.error(`❌ Error subiendo foto offline ${photo.id}:`, uploadError)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('daily-logs-photos')
        .getPublicUrl(fileName)

      photoUrls.push(publicUrl)

      // Marcar foto como sincronizada
      await db.photos.update(photo.id, {
        synced: true,
        remote_url: publicUrl,
        daily_log_id: remoteLogId,
      })
    } catch (err) {
      console.error(`❌ Error sync foto ${photo.id}:`, err)
    }
  }

  // Actualizar las URLs de fotos en el registro remoto
  if (photoUrls.length > 0) {
    // Obtener fotos existentes en el registro remoto
    const { data: remoteLog } = await supabase
      .from('daily_logs')
      .select('photos')
      .eq('id', remoteLogId)
      .single()

    const existingPhotos = remoteLog?.photos || []
    const allPhotos = [...existingPhotos, ...photoUrls]

    await supabase
      .from('daily_logs')
      .update({ photos: allPhotos })
      .eq('id', remoteLogId)
  }
}

// ============================================================
// INICIALIZAR LISTENER DE RECONEXIÓN
// ============================================================

let reconnectListenerAttached = false

export function initSyncOnReconnect(): void {
  if (reconnectListenerAttached) return
  if (typeof window === 'undefined') return

  reconnectListenerAttached = true

  window.addEventListener('online', () => {
    console.log('🔄 Conexión restaurada, iniciando sincronización...')
    // Pequeño delay para estabilizar la conexión
    setTimeout(() => {
      runSync().then(result => {
        if (result.synced > 0 || result.failed > 0) {
          console.log(`✅ Sync completado: ${result.synced} ok, ${result.failed} fallidos`)
        }
      })
    }, 2000)
  })
}
