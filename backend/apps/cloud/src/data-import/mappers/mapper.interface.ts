export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export interface AnalyticsImportRow {
  type: 'pageview' | 'custom_event'
  data: Record<string, unknown>
}

export interface ImportMapper {
  readonly provider: string
  readonly expectedFileExtension: string | null

  createRowStream(
    filePath: string | null,
    pid: string,
    importID: number,
    context?: Record<string, unknown>,
  ): AsyncIterable<AnalyticsImportRow>
}
