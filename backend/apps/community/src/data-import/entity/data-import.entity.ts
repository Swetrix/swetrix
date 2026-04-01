export enum DataImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const MAX_IMPORT_ID = 255

export class DataImport {
  id: number
  projectId: string
  provider: string
  status: DataImportStatus
  dateFrom: string | null
  dateTo: string | null
  totalRows: number
  importedRows: number
  invalidRows: number
  errorMessage: string | null
  createdAt: string
  finishedAt: string | null
  version: number
}
