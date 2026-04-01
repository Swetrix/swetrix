import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'

import { DataImportService } from './data-import.service'
import { getMapper } from './mappers'
import { ImportError } from './mappers/mapper.interface'
import { clickhouse } from '../common/integrations/clickhouse'

const CLICKHOUSE_DB = process.env.CLICKHOUSE_DATABASE || 'analytics'
const BATCH_SIZE = 5000
const IMPORT_TMP_DIR = path.resolve(os.tmpdir(), 'swetrix-imports')

export const DATA_IMPORT_QUEUE = 'data-import'

export interface DataImportJobData {
  id: number
  importId: number
  projectId: string
  provider: string
  fileName: string
}

@Processor(DATA_IMPORT_QUEUE, { concurrency: 1 })
export class DataImportProcessor extends WorkerHost {
  private readonly logger = new Logger(DataImportProcessor.name)

  constructor(private readonly dataImportService: DataImportService) {
    super()
  }

  async process(job: Job<DataImportJobData>): Promise<void> {
    const { id, importId, projectId, provider, fileName } = job.data
    const filePath = this.getImportFilePath(fileName)

    try {
      this.logger.log(
        `Processing import ${id} (importId=${importId}) for project ${projectId} (provider: ${provider})`,
      )

      await this.dataImportService.markProcessing(id)

      if (!filePath) {
        await this.dataImportService.markFailed(
          id,
          'Invalid import file reference. Please upload the file again.',
        )
        return
      }

      const mapper = getMapper(provider)
      if (!mapper) {
        await this.dataImportService.markFailed(
          id,
          `Unsupported provider: ${provider}`,
        )
        return
      }

      let importedRows = 0
      let totalRows = 0
      let minDate: string | null = null
      let maxDate: string | null = null

      const analyticsBatch: Record<string, unknown>[] = []
      const customEVBatch: Record<string, unknown>[] = []

      try {
        for await (const row of mapper.createRowStream(
          filePath,
          projectId,
          importId,
        )) {
          totalRows++

          const created = row.data.created as string
          if (created) {
            if (!minDate || created < minDate) minDate = created
            if (!maxDate || created > maxDate) maxDate = created
          }

          if (row.table === 'analytics') {
            analyticsBatch.push(row.data)
          } else {
            customEVBatch.push(row.data)
          }

          if (analyticsBatch.length >= BATCH_SIZE) {
            await this.flushBatch('analytics', analyticsBatch)
            importedRows += analyticsBatch.length
            analyticsBatch.length = 0
          }

          if (customEVBatch.length >= BATCH_SIZE) {
            await this.flushBatch('customEV', customEVBatch)
            importedRows += customEVBatch.length
            customEVBatch.length = 0
          }

          if (totalRows % 10000 === 0) {
            const progress = {
              importedRows:
                importedRows + analyticsBatch.length + customEVBatch.length,
              totalRows,
            }

            try {
              await job.updateProgress(progress)
            } catch (progressError) {
              const errorMessage =
                progressError instanceof Error
                  ? progressError.message
                  : String(progressError)
              this.logger.error(
                `Failed to update progress for import ${id} (importId=${importId}, importedRows=${progress.importedRows}, totalRows=${progress.totalRows}): ${errorMessage}`,
              )
            }
          }
        }

        if (analyticsBatch.length > 0) {
          await this.flushBatch('analytics', analyticsBatch)
          importedRows += analyticsBatch.length
        }

        if (customEVBatch.length > 0) {
          await this.flushBatch('customEV', customEVBatch)
          importedRows += customEVBatch.length
        }

        await this.dataImportService.markCompleted(id, {
          importedRows,
          invalidRows: 0,
          totalRows: importedRows,
          dateFrom: minDate ? new Date(minDate) : null,
          dateTo: maxDate ? new Date(maxDate) : null,
        })

        this.logger.log(`Import ${id} completed: ${importedRows} rows imported`)
      } catch (error) {
        this.logger.error(`Import ${id} failed: ${error.message}`, error.stack)

        try {
          await this.dataImportService.cleanupImportedRows(projectId, importId)
        } catch (cleanupError) {
          this.logger.error(
            `Failed to rollback partial import ${id}: ${cleanupError.message}`,
          )
        }

        const userMessage =
          error instanceof ImportError
            ? error.message
            : 'An unexpected error occurred while processing the import. Please try again or contact support.'

        await this.dataImportService.markFailed(id, userMessage)
      }
    } finally {
      this.cleanupFile(fileName)
    }
  }

  private async flushBatch(
    table: 'analytics' | 'customEV',
    batch: Record<string, unknown>[],
  ): Promise<void> {
    await clickhouse.insert({
      table: `${CLICKHOUSE_DB}.${table}`,
      values: batch,
      format: 'JSONEachRow',
    })
  }

  private cleanupFile(fileName: string): void {
    try {
      const resolvedPath = this.getImportFilePath(fileName)
      if (!resolvedPath) {
        this.logger.warn(
          `Skipped cleanup for invalid import file name: ${fileName}`,
        )
        return
      }

      if (fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isFile()) {
        fs.unlinkSync(resolvedPath)
      }
    } catch {
      this.logger.warn(`Failed to clean up temp file: ${fileName}`)
    }
  }

  private getImportFilePath(fileName: string): string | null {
    if (
      !fileName ||
      fileName !== path.basename(fileName) ||
      /[\\/]/.test(fileName)
    ) {
      return null
    }

    return path.join(IMPORT_TMP_DIR, fileName)
  }
}
