export interface DataWarehouseConnection {
  id: string
  projectId: string
  gcpProjectId: string
  datasetId: string
  location: string
  tablePrefix: string
  startDate: string
  enabled: boolean
  status: 'idle' | 'queued' | 'syncing' | 'error'
  nextDate: string
  lastSyncedDate: string | null
  lastSyncedAt: string | null
  nextSyncAt: string | null
  lastRowCount: number
  lastError: string | null
  serviceAccountEmail: string
  createdAt: string
}
