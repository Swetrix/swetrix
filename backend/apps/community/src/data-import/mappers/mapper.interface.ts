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
  readonly expectedFileExtension: string

  createRowStream(
    filePath: string,
    pid: string,
    importID: number,
  ): AsyncIterable<AnalyticsImportRow>
}
