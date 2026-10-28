import { ForbiddenException } from '@nestjs/common'
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
      if (
        record &&
        (!where.id || where.id === record.id) &&
        (!where.revision || where.revision === record.revision)
      ) {
        record = { ...record, ...value }
      }
      return { affected: record ? 1 : 0 }
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
  const project = { id: 'abcdefghijkl', admin: { id: 'owner-id' } }
  const projects: any = {
    getFullProject: jest.fn(async () => project),
    allowedToManage: jest.fn(),
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
