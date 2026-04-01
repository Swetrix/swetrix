import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common'

import {
  DataImport,
  DataImportStatus,
  MAX_IMPORT_ID,
} from './entity/data-import.entity'
import { clickhouse } from '../common/integrations/clickhouse'

const CLICKHOUSE_DB = process.env.CLICKHOUSE_DATABASE || 'analytics'

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name)

  private async getNextId(projectId: string): Promise<number> {
    const result = await clickhouse
      .query({
        query: `SELECT id FROM ${CLICKHOUSE_DB}.data_import FINAL WHERE projectId = {projectId:FixedString(12)} ORDER BY id ASC`,
        query_params: { projectId },
      })
      .then((rs) => rs.json<{ id: number | string }>())

    let next = 1

    for (const row of result.data || []) {
      const currentId = Number(row.id)

      if (currentId < next) {
        continue
      }

      if (currentId === next) {
        next += 1
        continue
      }

      break
    }

    if (next > MAX_IMPORT_ID) {
      throw new BadRequestException(
        `This project has reached the maximum number of imports (${MAX_IMPORT_ID}). Please delete an old import before creating a new one.`,
      )
    }

    return next
  }

  async create(projectId: string, provider: string): Promise<DataImport> {
    const active = await this.findActiveByProject(projectId)
    if (active) {
      throw new BadRequestException(
        'An import is already in progress for this project. Please wait for it to complete before starting a new one.',
      )
    }

    const id = await this.getNextId(projectId)

    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19)

    await clickhouse.insert({
      table: `${CLICKHOUSE_DB}.data_import`,
      values: [
        {
          id,
          projectId,
          provider,
          status: 'pending',
          dateFrom: null,
          dateTo: null,
          totalRows: 0,
          importedRows: 0,
          invalidRows: 0,
          errorMessage: null,
          createdAt: now,
          finishedAt: null,
          version: 1,
        },
      ],
      format: 'JSONEachRow',
    })

    return {
      id,
      projectId,
      provider,
      status: DataImportStatus.PENDING,
      dateFrom: null,
      dateTo: null,
      totalRows: 0,
      importedRows: 0,
      invalidRows: 0,
      errorMessage: null,
      createdAt: now,
      finishedAt: null,
      version: 1,
    }
  }

  private async findActiveByProject(
    projectId: string,
  ): Promise<DataImport | null> {
    const result = await clickhouse
      .query({
        query: `SELECT * FROM ${CLICKHOUSE_DB}.data_import FINAL WHERE projectId = {projectId:FixedString(12)} AND status IN ('pending', 'processing') LIMIT 1`,
        query_params: { projectId },
      })
      .then((rs) => rs.json<DataImport>())

    return result.data?.[0] || null
  }

  async findAllByProject(projectId: string): Promise<DataImport[]> {
    const result = await clickhouse
      .query({
        query: `SELECT * FROM ${CLICKHOUSE_DB}.data_import FINAL WHERE projectId = {projectId:FixedString(12)} ORDER BY createdAt DESC`,
        query_params: { projectId },
      })
      .then((rs) => rs.json<DataImport>())

    return result.data || []
  }

  async findOne(projectId: string, importId: number): Promise<DataImport> {
    const result = await clickhouse
      .query({
        query: `SELECT * FROM ${CLICKHOUSE_DB}.data_import FINAL WHERE projectId = {projectId:FixedString(12)} AND id = {id:UInt8} LIMIT 1`,
        query_params: { projectId, id: importId },
      })
      .then((rs) => rs.json<DataImport>())

    const dataImport = result.data?.[0]
    if (!dataImport) {
      throw new NotFoundException('Import not found')
    }

    return dataImport
  }

  async updateStatus(
    id: number,
    projectId: string,
    updates: Partial<DataImport>,
  ): Promise<void> {
    const existing = await this.findOne(projectId, id)
    const nextVersion = (existing.version || 0) + 1

    await clickhouse.insert({
      table: `${CLICKHOUSE_DB}.data_import`,
      values: [
        {
          ...existing,
          ...updates,
          id,
          projectId,
          version: nextVersion,
        },
      ],
      format: 'JSONEachRow',
    })
  }

  async markProcessing(id: number, projectId: string): Promise<void> {
    await this.updateStatus(id, projectId, {
      status: DataImportStatus.PROCESSING,
    })
  }

  async markCompleted(
    id: number,
    projectId: string,
    stats: {
      importedRows: number
      invalidRows: number
      totalRows: number
      dateFrom: string | null
      dateTo: string | null
    },
  ): Promise<void> {
    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19)
    await this.updateStatus(id, projectId, {
      status: DataImportStatus.COMPLETED,
      importedRows: stats.importedRows,
      invalidRows: stats.invalidRows,
      totalRows: stats.totalRows,
      dateFrom: stats.dateFrom,
      dateTo: stats.dateTo,
      finishedAt: now,
    })
  }

  async markFailed(
    id: number,
    projectId: string,
    errorMessage: string,
  ): Promise<void> {
    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19)
    await this.updateStatus(id, projectId, {
      status: DataImportStatus.FAILED,
      errorMessage,
      finishedAt: now,
    })
  }

  async cleanupImportedRows(
    projectId: string,
    importId: number,
  ): Promise<void> {
    await clickhouse.command({
      query: `ALTER TABLE ${CLICKHOUSE_DB}.analytics DELETE WHERE pid = {pid:FixedString(12)} AND importID = {importID:UInt8}`,
      query_params: { pid: projectId, importID: importId },
    })
    await clickhouse.command({
      query: `ALTER TABLE ${CLICKHOUSE_DB}.customEV DELETE WHERE pid = {pid:FixedString(12)} AND importID = {importID:UInt8}`,
      query_params: { pid: projectId, importID: importId },
    })
  }

  async deleteImport(projectId: string, importId: number): Promise<void> {
    const dataImport = await this.findOne(projectId, importId)

    if (
      dataImport.status === DataImportStatus.PENDING ||
      dataImport.status === DataImportStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Cannot delete an import that is still in progress.',
      )
    }

    try {
      await this.cleanupImportedRows(projectId, importId)
    } catch (error) {
      this.logger.error(
        `Failed to delete imported data from ClickHouse for import ${importId}: ${error.message}`,
      )
      throw new BadRequestException(
        'Failed to remove imported data. Please try again later.',
      )
    }

    await this.deleteImportRecord(projectId, importId)
  }

  async deleteImportRecord(projectId: string, importId: number): Promise<void> {
    await clickhouse.command({
      query: `ALTER TABLE ${CLICKHOUSE_DB}.data_import DELETE WHERE projectId = {projectId:FixedString(12)} AND id = {id:UInt8}`,
      query_params: { projectId, id: importId },
    })
  }

  async hasImportedDataInRange(
    projectId: string,
    from: string,
    to: string,
  ): Promise<boolean> {
    const result = await clickhouse
      .query({
        query: `SELECT count() as cnt FROM ${CLICKHOUSE_DB}.analytics WHERE pid = {pid:FixedString(12)} AND importID IS NOT NULL AND created >= {from:DateTime} AND created <= {to:DateTime} LIMIT 1`,
        query_params: { pid: projectId, from, to },
      })
      .then((rs) => rs.json<{ cnt: string }>())

    return Number(result.data?.[0]?.cnt) > 0
  }
}
