import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import {
  DataImport,
  DataImportStatus,
  MAX_IMPORT_ID,
} from './entity/data-import.entity'
import { clickhouse } from '../common/integrations/clickhouse'
import { Project } from '../project/entity/project.entity'

const CLICKHOUSE_DB = process.env.CLICKHOUSE_DATABASE || 'analytics'

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name)

  constructor(
    @InjectRepository(DataImport)
    private readonly dataImportRepository: Repository<DataImport>,
    private readonly dataSource: DataSource,
  ) {}

  private async getNextImportId(
    repository: Repository<DataImport>,
    projectId: string,
  ): Promise<number> {
    const existingImportIds = await repository
      .createQueryBuilder('di')
      .select('di.importId', 'importId')
      .where('di.projectId = :projectId', { projectId })
      .orderBy('di.importId', 'ASC')
      .getRawMany<{ importId: number | string }>()

    let next = 1

    for (const { importId } of existingImportIds) {
      const currentImportId = Number(importId)

      if (currentImportId < next) {
        continue
      }

      if (currentImportId === next) {
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
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Project).findOneOrFail({
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      })

      const repository = manager.getRepository(DataImport)
      const active = await repository.findOne({
        where: [
          { projectId, status: DataImportStatus.PENDING },
          { projectId, status: DataImportStatus.PROCESSING },
        ],
      })

      if (active) {
        throw new BadRequestException(
          'An import is already in progress for this project. Please wait for it to complete before starting a new one.',
        )
      }

      const importId = await this.getNextImportId(repository, projectId)

      const dataImport = repository.create({
        projectId,
        importId,
        provider,
        status: DataImportStatus.PENDING,
      })

      return repository.save(dataImport)
    })
  }

  async findAllByProject(projectId: string): Promise<DataImport[]> {
    return this.dataImportRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: number): Promise<DataImport | null> {
    return this.dataImportRepository.findOneBy({ id })
  }

  async findOne(projectId: string, importId: number): Promise<DataImport> {
    const dataImport = await this.dataImportRepository.findOne({
      where: { importId, projectId },
    })

    if (!dataImport) {
      throw new NotFoundException('Import not found')
    }

    return dataImport
  }

  async updateStatus(
    id: number,
    status: DataImportStatus,
    extra?: Partial<DataImport>,
  ): Promise<void> {
    await this.dataImportRepository.update(id, { status, ...extra })
  }

  async markProcessing(id: number): Promise<void> {
    await this.updateStatus(id, DataImportStatus.PROCESSING)
  }

  async markCompleted(
    id: number,
    stats: {
      importedRows: number
      invalidRows: number
      totalRows: number
      dateFrom: Date | null
      dateTo: Date | null
    },
  ): Promise<void> {
    await this.updateStatus(id, DataImportStatus.COMPLETED, {
      ...stats,
      finishedAt: new Date(),
    })
  }

  async markFailed(id: number, errorMessage: string): Promise<void> {
    await this.updateStatus(id, DataImportStatus.FAILED, {
      errorMessage,
      finishedAt: new Date(),
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
      await this.cleanupImportedRows(projectId, dataImport.importId)
    } catch (error) {
      this.logger.error(
        `Failed to delete imported data from ClickHouse for import ${dataImport.importId}: ${error.message}`,
      )
      throw new BadRequestException(
        'Failed to remove imported data. Please try again later.',
      )
    }

    await this.dataImportRepository.delete(dataImport.id)
  }

  async deleteImportRecord(id: number): Promise<void> {
    await this.dataImportRepository.delete(id)
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
      .then((resultSet) => resultSet.json<{ cnt: string }>())

    return Number(result.data?.[0]?.cnt) > 0
  }
}
