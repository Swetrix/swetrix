import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true
}

let lastSyncedAt: Date | null = null
const listeners = new Set<() => void>()

function notifySyncListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export function markSynced() {
  lastSyncedAt = new Date()
  notifySyncListeners()
}

function subscribeSynced(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSyncedSnapshot() {
  return lastSyncedAt
}

export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )
  const syncedAt = useSyncExternalStore(
    subscribeSynced,
    getSyncedSnapshot,
    () => null,
  )
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
    }
  }, [isOnline])

  const justReconnected = isOnline && wasOfflineRef.current

  const clearReconnected = useCallback(() => {
    wasOfflineRef.current = false
  }, [])

  return { isOnline, lastSyncedAt: syncedAt, justReconnected, clearReconnected }
}
