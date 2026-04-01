export interface AnalyticsImportRow {
  table: 'analytics' | 'customEV'
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
