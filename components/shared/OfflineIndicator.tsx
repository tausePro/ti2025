'use client'

import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getPendingSyncCount } from '@/lib/offline/daily-log-service'
import { runSync, onSyncEvent, initSyncOnReconnect } from '@/lib/offline/sync-manager'
import { Wifi, WifiOff, RefreshCw, CloudOff, Check } from 'lucide-react'

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null)

  useEffect(() => {
    initSyncOnReconnect()
  }, [])

  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingSyncCount()
      setPendingCount(count)
    }
    updateCount()

    const interval = setInterval(updateCount, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const unsub = onSyncEvent(event => {
      if (event.type === 'sync_start') {
        setSyncing(true)
        setLastSyncResult(null)
      }
      if (event.type === 'sync_complete') {
        setSyncing(false)
        setLastSyncResult(`${event.completed} sincronizados`)
        getPendingSyncCount().then(setPendingCount)
        setTimeout(() => setLastSyncResult(null), 4000)
      }
      if (event.type === 'sync_error') {
        setSyncing(false)
      }
    })
    return unsub
  }, [])

  const handleManualSync = async () => {
    if (!isOnline || syncing) return
    setSyncing(true)
    try {
      await runSync()
    } finally {
      setSyncing(false)
      const count = await getPendingSyncCount()
      setPendingCount(count)
    }
  }

  // No mostrar nada si está online y no hay pendientes
  if (isOnline && pendingCount === 0 && !lastSyncResult) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      {/* Estado de conexión */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium">
          <WifiOff className="h-4 w-4" />
          <span>Sin conexión</span>
        </div>
      )}

      {/* Pendientes de sync */}
      {pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={!isOnline || syncing}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors
            ${isOnline 
              ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' 
              : 'bg-gray-500 text-white cursor-not-allowed'
            }`}
        >
          {syncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
          <span>
            {syncing ? 'Sincronizando...' : `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`}
          </span>
        </button>
      )}

      {/* Resultado de sync */}
      {lastSyncResult && (
        <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in">
          <Check className="h-4 w-4" />
          <span>{lastSyncResult}</span>
        </div>
      )}
    </div>
  )
}

// Badge pequeño para usar inline en headers
export function SyncStatusBadge({ syncStatus }: { syncStatus: string }) {
  switch (syncStatus) {
    case 'synced':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <Check className="h-3 w-3" />
          Sincronizado
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          <CloudOff className="h-3 w-3" />
          Pendiente
        </span>
      )
    case 'syncing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Sincronizando
        </span>
      )
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          <WifiOff className="h-3 w-3" />
          Error sync
        </span>
      )
    default:
      return null
  }
}
