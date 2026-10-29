import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectQueue } from '@nestjs/bullmq'
import { Cron } from '@nestjs/schedule'
import { randomUUID } from 'crypto'
import { Queue } from 'bullmq'
import { In, LessThanOrEqual, Repository } from 'typeorm'
import { ProjectService } from '../project/project.service'
import { Project } from '../project/entity/project.entity'
import { PlanFeatureCode } from '../user/entities/user.entity'
import { DataExport } from './entity/data-export.entity'
import { BigQueryService } from './bigquery.service'
import {
  parseServiceAccountCredentials,
  ServiceAccountCredentials,
  WarehouseExportError,
} from './data-export.schema'
import {
  decryptWarehouseCredentials,
  encryptWarehouseCredentials,
} from './data-export.crypto'
import {
  SaveDataExportDto,
  shiftDay,
  utcDay,
  validateExportDate,
} from './data-export.dto'

export const DATA_EXPORT_QUEUE = 'data-export'
export interface DataExportJob {
  connectionId: string
  revision: string
  runId: string
}

const configKeys = [
  'gcpProjectId',
  'datasetId',
  'location',
  'tablePrefix',
  'startDate',
] as const

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name)

  constructor(
    @InjectRepository(DataExport)
    private readonly connections: Repository<DataExport>,
    private readonly projects: ProjectService,
    private readonly bigQuery: BigQueryService,
    @InjectQueue(DATA_EXPORT_QUEUE)
    private readonly queue: Queue<DataExportJob>,
  ) {}

  async authorize(projectId: string, uid: string) {
    const project = await this.projects.getFullProject(projectId)
    if (!project) throw new NotFoundException('Project not found')
    this.projects.allowedToManage(project, uid)
    return project
  }

  private assertAccountActive(project: Project) {
    if (
      project.admin?.isAccountBillingSuspended ||
      project.admin?.dashboardBlockReason
    ) {
      throw new ForbiddenException(
        'Restore the project owner account to export analytics data.',
      )
    }
  }

  async authorizeExport(projectId: string, uid: string) {
    const project = await this.authorize(projectId, uid)
    this.projects.assertProjectOwnerFeatureAccess(
      project,
      PlanFeatureCode.dataWarehouse,
    )
    this.assertAccountActive(project)
    return project
  }

  publicConnection(connection: DataExport | null) {
    if (!connection) return null
    return {
      id: connection.id,
      projectId: connection.projectId,
      gcpProjectId: connection.gcpProjectId,
      datasetId: connection.datasetId,
      location: connection.location,
      tablePrefix: connection.tablePrefix,
      startDate: connection.startDate,
      nextDate: connection.nextDate,
      enabled: connection.enabled,
      status: connection.status,
      nextSyncAt: connection.nextSyncAt,
      lastSyncedDate: connection.lastSyncedDate,
      lastSyncedAt: connection.lastSyncedAt,
      lastRowCount: connection.lastRowCount,
      lastError: connection.lastError,
      serviceAccountEmail: connection.serviceAccountEmail,
      createdAt: connection.createdAt,
    }
  }

  async get(projectId: string, uid: string) {
    await this.authorize(projectId, uid)
    return {
      connection: this.publicConnection(
        await this.connections.findOneBy({ projectId }),
      ),
    }
  }

  private async withCredentials(projectId: string) {
    return this.connections
      .createQueryBuilder('connection')
      .addSelect('connection.encryptedCredentials')
      .where('connection.projectId = :projectId', { projectId })
      .getOne()
  }

  private credentials(
    dto: SaveDataExportDto,
    connection: DataExport | null,
    ownerId: string,
  ): ServiceAccountCredentials {
    if (dto.credentials) {
      return parseServiceAccountCredentials(dto.credentials)
    }
    if (!connection || connection.ownerId !== ownerId) {
      throw new BadRequestException(
        'Provide a Google service account JSON key.',
      )
    }
    try {
      return parseServiceAccountCredentials(
        decryptWarehouseCredentials(
          connection.encryptedCredentials,
          connection.projectId,
          connection.id,
        ),
      )
    } catch {
      throw new BadRequestException(
        'The saved credentials could not be read. Upload a new service account key.',
      )
    }
  }

  private safeError(error: unknown) {
    return error instanceof WarehouseExportError
      ? error.message
      : 'Export failed. Check the dataset, service account access and key, then try again.'
  }

  async test(projectId: string, uid: string, dto: SaveDataExportDto) {
    const project = await this.authorizeExport(projectId, uid)
    validateExportDate(dto.startDate)
    const connection = await this.withCredentials(projectId)
    const credentials = this.credentials(dto, connection, project.admin.id)
    try {
      await this.bigQuery.validate({ ...dto, projectId }, credentials)
    } catch (error) {
      throw new BadRequestException(this.safeError(error))
    }
    return { success: true }
  }

  async save(projectId: string, uid: string, dto: SaveDataExportDto) {
    const project = await this.authorize(projectId, uid)
    if (dto.enabled) this.assertAccountActive(project)
    validateExportDate(dto.startDate)
    const previous = await this.withCredentials(projectId)
    const resetHistory =
      !previous ||
      previous.ownerId !== project.admin.id ||
      configKeys.some((key) => previous[key] !== dto[key])
    const changed = resetHistory || Boolean(dto.credentials)
    if (changed || dto.enabled) {
      this.projects.assertProjectOwnerFeatureAccess(
        project,
        PlanFeatureCode.dataWarehouse,
      )
    }
    const credentials = changed
      ? this.credentials(dto, previous, project.admin.id)
      : null

    if (changed) {
      await this.assertNotRunning(previous)
      try {
        await this.bigQuery.validate({ ...dto, projectId }, credentials)
      } catch (error) {
        throw new BadRequestException(this.safeError(error))
      }
    }

    const saved = await this.connections.manager.transaction(
      async (manager) => {
        await manager.getRepository(Project).findOne({
          where: { id: projectId },
          lock: { mode: 'pessimistic_write' },
        })
        const repository = manager.getRepository(DataExport)
        const current = await repository.findOne({
          where: { projectId },
          lock: { mode: 'pessimistic_write' },
        })
        if (current?.revision !== previous?.revision) {
          throw new ConflictException(
            'The connection changed. Reload and try again.',
          )
        }
        if (changed) await this.assertNotRunning(current)
        const connection =
          current ||
          repository.create({
            id: randomUUID(),
            projectId,
            createdAt: new Date(),
          })
        if (changed) {
          Object.assign(connection, {
            ...Object.fromEntries(configKeys.map((key) => [key, dto[key]])),
            ownerId: project.admin.id,
            revision: randomUUID(),
            encryptedCredentials: encryptWarehouseCredentials(
              JSON.stringify(credentials),
              projectId,
              connection.id,
            ),
            serviceAccountEmail: credentials.client_email,
            lastError: null,
            status: 'idle',
          })
          if (resetHistory) {
            Object.assign(connection, {
              nextDate: dto.startDate,
              lastSyncedDate: null,
              lastSyncedAt: null,
              lastRowCount: 0,
            })
          }
        }
        connection.enabled = dto.enabled
        if (!dto.enabled && connection.status === 'queued')
          connection.status = 'idle'
        if (changed || (dto.enabled && !previous?.enabled)) {
          connection.nextSyncAt = new Date()
        }
        await repository.save(connection)
        return connection
      },
    )

    if (saved.enabled) {
      try {
        await this.enqueue(saved)
      } catch {
        await this.connections.update(
          { id: saved.id, revision: saved.revision },
          {
            status: 'error',
            lastError:
              'The export queue is unavailable. Swetrix will retry automatically.',
          },
        )
      }
    }
    return this.get(projectId, uid)
  }

  private async assertNotRunning(connection: DataExport | null) {
    if (!connection) return
    const job = await this.queue.getJob(connection.id)
    if (job && !['completed', 'failed'].includes(await job.getState())) {
      throw new ConflictException(
        'Wait for the current export to finish before changing its destination or credentials.',
      )
    }
  }

  async remove(projectId: string, uid: string) {
    await this.authorize(projectId, uid)
    const connection = await this.connections.findOneBy({ projectId })
    await this.connections.delete({ projectId })
    if (connection) {
      try {
        const job = await this.queue.getJob(connection.id)
        if (job && (await job.getState()) !== 'active') await job.remove()
      } catch {
        this.logger.warn(
          'Disconnected warehouse job will be discarded by the worker.',
        )
      }
    }
    return { success: true }
  }

  async sync(projectId: string, uid: string) {
    await this.authorizeExport(projectId, uid)
    const connection = await this.connections.findOneBy({ projectId })
    if (!connection)
      throw new NotFoundException('No warehouse connection configured')
    if (!connection.enabled)
      throw new ConflictException('Resume the connection before syncing.')
    try {
      await this.enqueue(connection)
    } catch {
      throw new ServiceUnavailableException(
        'The export queue is unavailable. Try again shortly.',
      )
    }
    return { success: true }
  }

  private async enqueue(connection: DataExport) {
    await this.connections.update(
      {
        id: connection.id,
        revision: connection.revision,
        enabled: true,
        status: In(['idle', 'error']),
      },
      { status: 'queued', nextSyncAt: new Date() },
    )
    await this.queue.add(
      'sync',
      {
        connectionId: connection.id,
        revision: connection.revision,
        runId: randomUUID(),
      },
      {
        jobId: connection.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    )
  }

  @Cron('0 * * * * *', { waitForCompletion: true })
  async schedule() {
    const due = await this.connections.find({
      where: { enabled: true, nextSyncAt: LessThanOrEqual(new Date()) },
      order: { nextSyncAt: 'ASC' },
      take: 100,
    })
    for (const connection of due) {
      try {
        const project = await this.projects.getFullProject(connection.projectId)
        if (
          !project ||
          (await this.pauseIfPlanUnavailable(connection, project))
        )
          continue
        await this.enqueue(connection)
      } catch {
        this.logger.warn(
          'Could not enqueue a warehouse export; the next scheduler pass will retry.',
        )
      }
    }
  }

  private async pauseIfPlanUnavailable(
    connection: DataExport,
    project: Project,
  ) {
    if (
      this.projects.projectOwnerHasFeature(
        project,
        PlanFeatureCode.dataWarehouse,
      )
    ) {
      return false
    }
    await this.connections.update(
      { id: connection.id, revision: connection.revision },
      {
        enabled: false,
        status: 'error',
        nextSyncAt: null,
        lastError:
          'Data warehouse integrations require the project owner to have a Plus or Enterprise plan. Upgrade and resume the connection.',
      },
    )
    return true
  }

  async process(data: DataExportJob) {
    const connection = await this.connections
      .createQueryBuilder('connection')
      .addSelect('connection.encryptedCredentials')
      .where('connection.id = :id AND connection.revision = :revision', {
        id: data.connectionId,
        revision: data.revision,
      })
      .getOne()
    if (!connection) return
    const criteria = { id: connection.id, revision: connection.revision }
    if (!connection.enabled) {
      await this.connections.update(
        { ...criteria, enabled: false, status: In(['queued', 'syncing']) },
        { status: 'idle' },
      )
      return
    }
    try {
      const project = await this.projects.getFullProject(connection.projectId)
      if (!project) return
      if (project.admin?.id !== connection.ownerId) {
        await this.connections.update(criteria, {
          enabled: false,
          status: 'error',
          lastError:
            'Project ownership changed. Save the connection with a new service account key to resume.',
        })
        return
      }
      if (await this.pauseIfPlanUnavailable(connection, project)) return
      this.assertAccountActive(project)
      await this.connections.update(
        { ...criteria, enabled: true },
        {
          status: 'syncing',
          lastError: null,
        },
      )
      const credentials = this.credentials(
        {} as SaveDataExportDto,
        connection,
        connection.ownerId,
      )
      const yesterday = shiftDay(utcDay(), -1)
      let date = [
        connection.startDate,
        [connection.nextDate, shiftDay(yesterday, -2)].sort()[0],
      ]
        .sort()
        .at(-1)!
      let rows = 0
      let days = 0
      while (date <= yesterday && days < 7) {
        const current = await this.connections.findOneBy(criteria)
        if (!current || !current.enabled) {
          if (current)
            await this.connections.update(
              {
                ...criteria,
                enabled: false,
                status: In(['queued', 'syncing']),
              },
              { status: 'idle' },
            )
          return
        }
        const currentProject = await this.projects.getFullProject(
          connection.projectId,
        )
        if (
          !currentProject ||
          currentProject.admin?.id !== connection.ownerId
        ) {
          await this.connections.update(criteria, {
            enabled: false,
            status: 'error',
            lastError:
              'Project ownership changed. Reconnect the warehouse to resume.',
          })
          return
        }
        if (await this.pauseIfPlanUnavailable(connection, currentProject))
          return
        this.assertAccountActive(currentProject)
        rows += await this.bigQuery.exportDay(
          connection,
          credentials,
          date,
          data.runId,
        )
        const nextDate = [current.nextDate, shiftDay(date, 1)].sort().at(-1)!
        await this.connections.update(criteria, {
          nextDate,
          lastSyncedDate: [current.lastSyncedDate || date, date].sort().at(-1)!,
          lastSyncedAt: new Date(),
          lastRowCount: rows,
        })
        date = shiftDay(date, 1)
        days++
      }
      const tomorrowMorning = new Date(`${shiftDay(utcDay(), 1)}T06:00:00Z`)
      const todayMorning = new Date(`${utcDay()}T06:00:00Z`)
      const nextSyncAt =
        date <= yesterday
          ? new Date()
          : new Date() < todayMorning
            ? todayMorning
            : tomorrowMorning
      const completed = await this.connections.update(
        { ...criteria, enabled: true },
        {
          status: 'idle',
          nextSyncAt,
          lastError: null,
        },
      )
      if (!completed.affected) {
        await this.connections.update(
          { ...criteria, enabled: false, status: In(['queued', 'syncing']) },
          { status: 'idle' },
        )
      }
    } catch (error) {
      const message = this.safeError(error)
      const failed = await this.connections.update(
        { ...criteria, enabled: true },
        {
          status: 'error',
          lastError: message,
          nextSyncAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
      )
      if (!failed.affected) {
        await this.connections.update(
          { ...criteria, enabled: false, status: In(['queued', 'syncing']) },
          { status: 'idle' },
        )
      }
      throw new Error(message)
    }
  }
}
