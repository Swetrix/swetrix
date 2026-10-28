import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common'
import { generateKeyPairSync } from 'crypto'

jest.mock('../project/project.service', () => ({ ProjectService: class {} }))
jest.mock('../project/entity/project.entity', () => ({ Project: class {} }))
jest.mock('./bigquery.service', () => ({ BigQueryService: class {} }))
jest.mock('./data-export.crypto', () => ({
  encryptWarehouseCredentials: jest.fn((value) => `encrypted:${value}`),
  decryptWarehouseCredentials: jest.fn((value) => value.slice(10)),
}))

import { DataExportService } from './data-export.service'
import { DataExport } from './entity/data-export.entity'
import { SaveDataExportDto, validateExportDate } from './data-export.dto'
import { WarehouseExportError } from './data-export.schema'
import {
  PlanCode,
  PlanFeatureCode,
  PlanType,
  userHasPlanFeature,
} from '../user/entities/user.entity'

const key = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ format: 'pem', type: 'pkcs8' })
  .toString()
const credentials = JSON.stringify({
  type: 'service_account',
  project_id: 'warehouse-project',
  client_email: 'swetrix@warehouse-project.iam.gserviceaccount.com',
  private_key: key,
})

const makeConnection = (overrides: Partial<DataExport> = {}): DataExport =>
  ({
    id: 'connection-id',
    revision: 'revision-id',
    ownerId: 'owner-id',
    projectId: 'abcdefghijkl',
    gcpProjectId: 'warehouse-project',
    datasetId: 'analytics',
    location: 'EU',
    tablePrefix: 'swetrix_abcdefghijkl',
    encryptedCredentials: `encrypted:${credentials}`,
    serviceAccountEmail: 'swetrix@warehouse-project.iam.gserviceaccount.com',
    startDate: '2026-10-01',
    nextDate: '2026-10-27',
    enabled: true,
    status: 'idle',
    nextSyncAt: new Date('2026-10-27T06:00:00Z'),
    lastSyncedDate: '2026-10-26',
    lastSyncedAt: new Date('2026-10-26T06:00:00Z'),
    lastRowCount: 100,
    lastError: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  }) as DataExport

function setup(initial: DataExport | null = makeConnection()) {
  let record = initial
  const repository: any = {
    findOneBy: jest.fn(async (where) => {
      if (!record) return null
      if (where.id && where.id !== record.id) return null
      if (where.revision && where.revision !== record.revision) return null
      return { ...record }
    }),
    findOne: jest.fn(async () => record && { ...record }),
    find: jest.fn(async () => (record ? [{ ...record }] : [])),
    update: jest.fn(async (where, value) => {
      const matches =
        record &&
        (!where.id || where.id === record.id) &&
        (!where.revision || where.revision === record.revision) &&
        (where.enabled === undefined || where.enabled === record.enabled) &&
        (!where.status ||
          (typeof where.status === 'string'
            ? where.status === record.status
            : where.status.value.includes(record.status)))
      if (matches) {
        record = { ...record, ...value }
      }
      return { affected: matches ? 1 : 0 }
    }),
    save: jest.fn(async (value) => {
      record = { ...record, ...value }
      return record
    }),
    delete: jest.fn(async () => {
      record = null
    }),
    create: jest.fn((value) => value),
  }
  repository.createQueryBuilder = jest.fn(() => {
    const builder: any = {
      addSelect: jest.fn(() => builder),
      where: jest.fn(() => builder),
      getOne: jest.fn(async () => record && { ...record }),
    }
    return builder
  })
  repository.manager = {
    transaction: async (fn: any) => fn({ getRepository: () => repository }),
  }
  const project = {
    id: 'abcdefghijkl',
    admin: {
      id: 'owner-id',
      planCode: PlanCode['100k'],
      planType: PlanType.plus,
    },
  }
  const projects: any = {
    getFullProject: jest.fn(async () => project),
    allowedToManage: jest.fn(),
    projectOwnerHasFeature: jest.fn((project, feature) =>
      userHasPlanFeature(project?.admin, feature),
    ),
    assertProjectOwnerFeatureAccess: jest.fn((project, feature) => {
      if (!userHasPlanFeature(project?.admin, feature)) {
        throw new HttpException(
          'This feature is not available on the current project owner plan.',
          HttpStatus.PAYMENT_REQUIRED,
        )
      }
    }),
  }
  const bigQuery: any = {
    validate: jest.fn(async () => {}),
    exportDay: jest.fn(async () => 10),
  }
  const queue: any = {
    getJob: jest.fn(async () => null),
    add: jest.fn(async () => ({})),
  }
  const service = new DataExportService(repository, projects, bigQuery, queue)
  const job = {
    connectionId: 'connection-id',
    revision: 'revision-id',
    runId: 'run-id',
  }
  const dto = (extra = {}): SaveDataExportDto => ({
    gcpProjectId: 'warehouse-project',
    datasetId: 'analytics',
    location: 'EU',
    tablePrefix: 'swetrix_abcdefghijkl',
    startDate: '2026-10-01',
    enabled: true,
    ...extra,
  })
  return {
    service,
    repository,
    projects,
    project,
    bigQuery,
    queue,
    job,
    dto,
    record: () => record,
  }
}

describe('warehouse orchestration', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-27T10:00:00Z'))
  })
  afterEach(() => jest.useRealTimers())

  it('never returns stored credentials or internal owner/revision data', async () => {
    const { service } = setup()
    const result = await service.get('abcdefghijkl', 'owner-id')
    expect(JSON.stringify(result)).not.toContain(key)
    expect(result.connection).not.toHaveProperty('encryptedCredentials')
    expect(result.connection).not.toHaveProperty('ownerId')
    expect(result.connection).not.toHaveProperty('revision')
  })

  it('rejects a viewer even for a public project', async () => {
    const { service, projects, bigQuery, dto } = setup()
    projects.allowedToManage.mockImplementation(() => {
      throw new ForbiddenException()
    })
    await expect(service.save('abcdefghijkl', 'viewer', dto())).rejects.toThrow(
      ForbiddenException,
    )
    await expect(
      service.authorizeExport('abcdefghijkl', 'viewer'),
    ).rejects.toThrow(ForbiddenException)
    expect(bigQuery.validate).not.toHaveBeenCalled()
  })

  it.each([
    [PlanCode['100k'], PlanType.plus, true],
    [PlanCode['100k'], PlanType.enterprise, true],
    [PlanCode['100k'], PlanType.standard, false],
    [PlanCode['100k'], null, false],
    [PlanCode.trial, PlanType.plus, false],
    [PlanCode.free, PlanType.plus, false],
    [PlanCode.none, PlanType.enterprise, false],
  ])(
    'uses the existing plan policy for %s / %s (warehouse access: %s)',
    async (planCode, planType, allowed) => {
      const { service, project, projects } = setup()
      Object.assign(project.admin, { planCode, planType })
      expect(
        userHasPlanFeature(project.admin, PlanFeatureCode.dataWarehouse),
      ).toBe(allowed)
      if (allowed) {
        await expect(
          service.authorizeExport(project.id, 'owner-id'),
        ).resolves.toBe(project)
      } else {
        await expect(
          service.authorizeExport(project.id, 'owner-id'),
        ).rejects.toMatchObject({ status: HttpStatus.PAYMENT_REQUIRED })
      }
      expect(projects.assertProjectOwnerFeatureAccess).toHaveBeenCalledWith(
        project,
        PlanFeatureCode.dataWarehouse,
      )
    },
  )

  it.each([
    'raw export',
    'test connection',
    'sync now',
    'create enabled',
    'create paused',
    'change destination while paused',
    'rotate credentials while paused',
    'resume',
    'save enabled',
  ])('rejects %s for a Standard owner before external work', async (action) => {
    const initial = action.startsWith('create')
      ? null
      : makeConnection({ enabled: action !== 'resume' })
    const { service, project, bigQuery, queue, repository, dto } =
      setup(initial)
    project.admin.planType = PlanType.standard
    let operation: Promise<unknown>
    switch (action) {
      case 'raw export':
        operation = service.authorizeExport(project.id, 'owner-id')
        break
      case 'test connection':
        operation = service.test(project.id, 'owner-id', dto())
        break
      case 'sync now':
        operation = service.sync(project.id, 'owner-id')
        break
      default:
        operation = service.save(
          project.id,
          'owner-id',
          dto({
            ...(action.startsWith('create') ? { credentials } : {}),
            ...(action === 'change destination while paused'
              ? { datasetId: 'another_dataset' }
              : {}),
            ...(action === 'rotate credentials while paused'
              ? { credentials }
              : {}),
            enabled: !action.includes('paused'),
          }),
        )
    }
    await expect(operation).rejects.toMatchObject({
      status: HttpStatus.PAYMENT_REQUIRED,
    })
    expect(bigQuery.validate).not.toHaveBeenCalled()
    expect(bigQuery.exportDay).not.toHaveBeenCalled()
    expect(queue.add).not.toHaveBeenCalled()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('keeps status, unchanged pause and disconnect available after a downgrade', async () => {
    const { service, project, dto, bigQuery, queue, record, projects } = setup()
    project.admin.planType = PlanType.standard
    await expect(service.get(project.id, 'owner-id')).resolves.toHaveProperty(
      'connection.id',
      'connection-id',
    )
    await service.save(project.id, 'owner-id', dto({ enabled: false }))
    expect(record().enabled).toBe(false)
    await service.remove(project.id, 'owner-id')
    expect(record()).toBeNull()
    expect(projects.assertProjectOwnerFeatureAccess).not.toHaveBeenCalled()
    expect(bigQuery.validate).not.toHaveBeenCalled()
    expect(bigQuery.exportDay).not.toHaveBeenCalled()
    expect(queue.add).not.toHaveBeenCalled()
  })

  it('uses the billed project owner plan rather than the requesting manager plan', async () => {
    const { service, project, projects } = setup()
    await expect(
      service.authorizeExport(project.id, 'standard-manager'),
    ).resolves.toBe(project)
    expect(projects.allowedToManage).toHaveBeenLastCalledWith(
      project,
      'standard-manager',
    )
    project.admin.planType = PlanType.standard
    await expect(
      service.authorizeExport(project.id, 'plus-manager'),
    ).rejects.toMatchObject({ status: HttpStatus.PAYMENT_REQUIRED })
    expect(projects.allowedToManage).toHaveBeenLastCalledWith(
      project,
      'plus-manager',
    )
    expect(projects.assertProjectOwnerFeatureAccess).toHaveBeenLastCalledWith(
      project,
      PlanFeatureCode.dataWarehouse,
    )
  })

  it('disables a scheduled export after downgrade without adding a queue job', async () => {
    const { service, project, queue, bigQuery, record } = setup()
    project.admin.planType = PlanType.standard
    await service.schedule()
    expect(queue.add).not.toHaveBeenCalled()
    expect(bigQuery.exportDay).not.toHaveBeenCalled()
    expect(record()).toMatchObject({
      enabled: false,
      status: 'error',
      nextSyncAt: null,
      nextDate: '2026-10-27',
      lastSyncedDate: '2026-10-26',
    })
    expect(record().lastError).toContain('Plus')
  })

  it('disables an already queued export after downgrade without losing its checkpoint', async () => {
    const { service, project, bigQuery, job, record } = setup(
      makeConnection({ status: 'queued' }),
    )
    project.admin.planType = PlanType.standard
    await service.process(job)
    expect(bigQuery.exportDay).not.toHaveBeenCalled()
    expect(record()).toMatchObject({
      enabled: false,
      status: 'error',
      nextSyncAt: null,
      nextDate: '2026-10-27',
      lastSyncedDate: '2026-10-26',
    })
    expect(record().lastError).toContain('Plus')
  })

  it('preserves the plan error when a queued job or retry runs after the scheduler disabled it', async () => {
    const { service, project, bigQuery, job, record } = setup(
      makeConnection({ status: 'queued' }),
    )
    project.admin.planType = PlanType.standard
    await service.schedule()
    await service.process(job)
    await service.process(job)
    expect(bigQuery.exportDay).not.toHaveBeenCalled()
    expect(record()).toMatchObject({
      enabled: false,
      status: 'error',
      nextSyncAt: null,
    })
    expect(record().lastError).toContain('Plus')
  })

  it('preserves a scheduler downgrade during the final day instead of reporting success', async () => {
    const { service, project, bigQuery, job, record } = setup(
      makeConnection({ startDate: '2026-10-26', nextDate: '2026-10-26' }),
    )
    bigQuery.exportDay.mockImplementationOnce(async () => {
      project.admin.planType = PlanType.standard
      await service.schedule()
      return 10
    })
    await service.process(job)
    expect(bigQuery.exportDay).toHaveBeenCalledTimes(1)
    expect(record()).toMatchObject({
      enabled: false,
      status: 'error',
      nextSyncAt: null,
      nextDate: '2026-10-27',
      lastSyncedDate: '2026-10-26',
    })
    expect(record().lastError).toContain('Plus')
  })

  it('stops between days after downgrade and preserves the completed day checkpoint', async () => {
    const { service, project, bigQuery, job, record } = setup(
      makeConnection({ nextDate: '2026-10-01', lastSyncedDate: null }),
    )
    bigQuery.exportDay.mockImplementationOnce(async () => {
      project.admin.planType = PlanType.standard
      return 10
    })
    await service.process(job)
    expect(bigQuery.exportDay).toHaveBeenCalledTimes(1)
    expect(record()).toMatchObject({
      enabled: false,
      status: 'error',
      nextSyncAt: null,
      nextDate: '2026-10-02',
      lastSyncedDate: '2026-10-01',
      lastRowCount: 10,
    })
    expect(record().lastError).toContain('Plus')
  })

  it('refreshes the latest three completed days without moving the high-water mark backwards', async () => {
    const { service, bigQuery, job, record } = setup()
    await service.process(job)
    expect(bigQuery.exportDay.mock.calls.map((call) => call[2])).toEqual([
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
    ])
    expect(
      bigQuery.exportDay.mock.calls.every((call) => call[3] === 'run-id'),
    ).toBe(true)
    expect(record().nextDate).toBe('2026-10-27')
    expect(record().lastSyncedDate).toBe('2026-10-26')
    expect(record().lastRowCount).toBe(30)
    expect(record().nextSyncAt.toISOString()).toBe('2026-10-28T06:00:00.000Z')
  })

  it('refreshes the prior days even when there is a new daily partition to export', async () => {
    const { service, bigQuery, job } = setup(
      makeConnection({ nextDate: '2026-10-26' }),
    )
    await service.process(job)
    expect(bigQuery.exportDay.mock.calls.map((call) => call[2])).toEqual([
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
    ])
  })

  it('bounds a historical batch to seven days then leaves it due for continuation', async () => {
    const { service, bigQuery, job, record } = setup(
      makeConnection({ nextDate: '2026-10-01' }),
    )
    await service.process(job)
    expect(bigQuery.exportDay).toHaveBeenCalledTimes(7)
    expect(record().nextDate).toBe('2026-10-08')
    expect(record().nextSyncAt.getTime()).toBe(Date.now())
  })

  it('never exports before the selected start date or includes the current day', async () => {
    const { service, bigQuery, job } = setup(
      makeConnection({ startDate: '2026-10-26', nextDate: '2026-10-26' }),
    )
    await service.process(job)
    expect(bigQuery.exportDay).toHaveBeenCalledTimes(1)
    expect(bigQuery.exportDay.mock.calls[0][2]).toBe('2026-10-26')
  })

  it('does not advance a failed day and stores only safe provider errors', async () => {
    const { service, bigQuery, job, record } = setup(
      makeConnection({ nextDate: '2026-10-01' }),
    )
    bigQuery.exportDay
      .mockResolvedValueOnce(10)
      .mockRejectedValueOnce(new Error(`secret=${key}`))
    await expect(service.process(job)).rejects.toThrow('Export failed.')
    expect(record().nextDate).toBe('2026-10-02')
    expect(record().lastError).not.toContain(key)
    expect(record().nextSyncAt.toISOString()).toBe('2026-10-27T16:00:00.000Z')
  })

  it('preserves actionable sanitized provider failures', async () => {
    const { service, bigQuery, job, record } = setup()
    bigQuery.exportDay.mockRejectedValue(
      new WarehouseExportError(
        'The dataset location does not match the selected location.',
      ),
    )
    await expect(service.process(job)).rejects.toThrow('dataset location')
    expect(record().status).toBe('error')
  })

  it('stops a queued paused job and clears stale queued status', async () => {
    const { service, bigQuery, job, record } = setup(
      makeConnection({ enabled: false, status: 'queued' }),
    )
    await service.process(job)
    expect(bigQuery.exportDay).not.toHaveBeenCalled()
    expect(record().status).toBe('idle')
  })

  it('stops before the next day after a pause during an export', async () => {
    const { service, bigQuery, job, repository, record } = setup()
    bigQuery.exportDay.mockImplementationOnce(async () => {
      await repository.update({}, { enabled: false })
      return 10
    })
    await service.process(job)
    expect(bigQuery.exportDay).toHaveBeenCalledTimes(1)
    expect(record().status).toBe('idle')
  })

  it('clears syncing status when manually paused during the final day', async () => {
    const { service, bigQuery, job, repository, record } = setup(
      makeConnection({ startDate: '2026-10-26', nextDate: '2026-10-26' }),
    )
    bigQuery.exportDay.mockImplementationOnce(async () => {
      await repository.update({}, { enabled: false })
      return 10
    })
    await service.process(job)
    expect(record().enabled).toBe(false)
    expect(record().status).toBe('idle')
    expect(record().nextDate).toBe('2026-10-27')
  })

  it('disables the connector after an ownership transfer before exporting data', async () => {
    const { service, bigQuery, job, project, record } = setup()
    project.admin.id = 'new-owner'
    await service.process(job)
    expect(bigQuery.exportDay).not.toHaveBeenCalled()
    expect(record().enabled).toBe(false)
    expect(record().lastError).toContain('ownership changed')
  })

  it('rechecks ownership between days', async () => {
    const { service, bigQuery, job, project, record } = setup()
    bigQuery.exportDay.mockImplementationOnce(async () => {
      project.admin.id = 'new-owner'
      return 10
    })
    await service.process(job)
    expect(bigQuery.exportDay).toHaveBeenCalledTimes(1)
    expect(record().enabled).toBe(false)
  })

  it('will not reuse the previous owner credentials', async () => {
    const { service, project, dto } = setup()
    project.admin.id = 'new-owner'
    await expect(
      service.test('abcdefghijkl', 'new-owner', dto()),
    ).rejects.toThrow('Provide a Google service account')
  })

  it('allows pause while active but rejects destination changes', async () => {
    const { service, queue, dto, record } = setup(
      makeConnection({ status: 'syncing' }),
    )
    queue.getJob.mockResolvedValue({ getState: async () => 'active' })
    await service.save('abcdefghijkl', 'owner-id', dto({ enabled: false }))
    expect(record().enabled).toBe(false)
    await expect(
      service.save('abcdefghijkl', 'owner-id', dto({ datasetId: 'different' })),
    ).rejects.toThrow('Wait for the current export')
  })

  it('can pause without decrypting an unreadable stored key', async () => {
    const { service, dto, record } = setup(
      makeConnection({ encryptedCredentials: 'corrupted-key' }),
    )
    await service.save('abcdefghijkl', 'owner-id', dto({ enabled: false }))
    expect(record().enabled).toBe(false)
  })

  it('rotates credentials without re-exporting all historical data', async () => {
    const { service, dto, record } = setup()
    await service.save('abcdefghijkl', 'owner-id', dto({ credentials }))
    expect(record().nextDate).toBe('2026-10-27')
    expect(record().lastSyncedDate).toBe('2026-10-26')
    expect(record().revision).not.toBe('revision-id')
  })

  it('resets history when moving to a new destination', async () => {
    const { service, dto, record } = setup()
    await service.save(
      'abcdefghijkl',
      'owner-id',
      dto({ datasetId: 'new_dataset' }),
    )
    expect(record().nextDate).toBe('2026-10-01')
    expect(record().lastSyncedDate).toBeNull()
  })

  it('persists a configured destination for scheduler recovery when Redis is down', async () => {
    const { service, dto, queue, record } = setup(null)
    queue.add.mockRejectedValue(new Error('Redis disconnected'))
    await service.save('abcdefghijkl', 'owner-id', dto({ credentials }))
    expect(record().enabled).toBe(true)
    expect(record().status).toBe('error')
    expect(record().nextSyncAt.getTime()).toBe(Date.now())
  })

  it('disconnects an active job without deleting warehouse data or retaining credentials', async () => {
    const { service, queue, bigQuery, record } = setup()
    const remove = jest.fn()
    queue.getJob.mockResolvedValue({ getState: async () => 'active', remove })
    await service.remove('abcdefghijkl', 'owner-id')
    expect(record()).toBeNull()
    expect(remove).not.toHaveBeenCalled()
    expect(bigQuery.exportDay).not.toHaveBeenCalled()
  })

  it.each(['2026-02-30', '2026-10-27', '2026-10-28', '1999-12-31', 'invalid'])(
    'rejects invalid or incomplete UTC date %s',
    (value) => {
      expect(() => validateExportDate(value)).toThrow()
    },
  )
})
