import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'

import { DataImportService } from './data-import.service'
import { getMapper } from './mappers'
import { clickhouse } from '../common/integrations/clickhouse'

const CLICKHOUSE_DB = process.env.CLICKHOUSE_DATABASE || 'analytics'
const BATCH_SIZE = 5000
const IMPORT_TMP_DIR = path.resolve(os.tmpdir(), 'swetrix-imports')

export const DATA_IMPORT_QUEUE = 'data-import'

export interface DataImportJobData {
  importId: number
  projectId: string
  provider: string
  filePath: string
}

@Processor(DATA_IMPORT_QUEUE, { concurrency: 1 })
export class DataImportProcessor extends WorkerHost {
  private readonly logger = new Logger(DataImportProcessor.name)

  constructor(private readonly dataImportService: DataImportService) {
    super()
  }

  async process(job: Job<DataImportJobData>): Promise<void> {
    const { importId, projectId, provider, filePath } = job.data

    try {
      this.logger.log(
        `Processing import ${importId} for project ${projectId} (provider: ${provider})`,
      )

      await this.dataImportService.markProcessing(importId, projectId)

      const mapper = getMapper(provider)
      if (!mapper) {
        await this.dataImportService.markFailed(
          importId,
          projectId,
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
                `Failed to update progress for import ${importId} (projectId=${projectId}, importedRows=${progress.importedRows}, totalRows=${progress.totalRows}): ${errorMessage}`,
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

        await this.dataImportService.markCompleted(importId, projectId, {
          importedRows,
          invalidRows: 0,
          totalRows: importedRows,
          dateFrom: minDate ? minDate.split(' ')[0] : null,
          dateTo: maxDate ? maxDate.split(' ')[0] : null,
        })

        this.logger.log(
          `Import ${importId} completed: ${importedRows} rows imported`,
        )
      } catch (error) {
        this.logger.error(
          `Import ${importId} failed: ${error.message}`,
          error.stack,
        )

        try {
          await this.dataImportService.cleanupImportedRows(projectId, importId)
        } catch (cleanupError) {
          this.logger.error(
            `Failed to rollback partial import ${importId}: ${cleanupError.message}`,
          )
        }

        await this.dataImportService.markFailed(
          importId,
          projectId,
          error.message,
        )
      }
    } finally {
      this.cleanupFile(filePath)
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

  private cleanupFile(filePath: string): void {
    try {
      const resolvedPath = path.resolve(filePath)
      const relativePath = path.relative(IMPORT_TMP_DIR, resolvedPath)
      const isImportTempFile =
        relativePath !== '' &&
        !relativePath.startsWith('..') &&
        !path.isAbsolute(relativePath)

      if (!isImportTempFile) {
        this.logger.warn(
          `Skipped cleanup outside import temp dir: ${resolvedPath}`,
        )
        return
      }

      if (fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isFile()) {
        fs.unlinkSync(resolvedPath)
      }
    } catch {
      this.logger.warn(`Failed to clean up temp file: ${filePath}`)
    }
  }
}
