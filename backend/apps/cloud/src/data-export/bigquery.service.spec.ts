import { generateKeyPairSync } from 'crypto'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

import { BigQueryService } from './bigquery.service'
import {
  BigQueryConfig,
  parseServiceAccountCredentials,
  WAREHOUSE_SCHEMA,
  WarehouseExportError,
} from './data-export.schema'

jest.mock('../common/integrations/clickhouse', () => ({ clickhouse: {} }))
jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}))

const config: BigQueryConfig = {
  projectId: 'abcdefghijkl',
  gcpProjectId: 'example-project',
  datasetId: 'analytics',
  location: 'EU',
  tablePrefix: 'swetrix_abcdefghijkl',
}

describe('BigQueryService', () => {
  let service: any
  beforeEach(() => {
    service = new BigQueryService({} as any)
    jest.restoreAllMocks()
  })

  const table = () => ({
    type: 'TABLE',
    description:
      'Swetrix warehouse export v1; project=abcdefghijkl; kind=pageviews',
    timePartitioning: { type: 'DAY', field: 'event_date' },
    schema: { fields: WAREHOUSE_SCHEMA },
  })

  it.each([
    { description: 'An unrelated table' },
    { timePartitioning: { type: 'MONTH', field: 'event_date' } },
    { schema: { fields: [] } },
    { type: 'VIEW' },
  ])(
    'refuses to overwrite incompatible existing tables: %j',
    async (override) => {
      jest.spyOn(service, 'json').mockResolvedValue({ ...table(), ...override })
      await expect(
        service.ensureTable({}, config, 'pageviews'),
      ).rejects.toThrow('unused table prefix')
    },
  )

  it('accepts only its owned schema and partition', async () => {
    jest.spyOn(service, 'json').mockResolvedValue(table())
    await expect(
      service.ensureTable({}, config, 'pageviews'),
    ).resolves.toBeUndefined()
  })

  it('rechecks table ownership after a concurrent table creation conflict', async () => {
    const json = jest
      .spyOn(service, 'json')
      .mockRejectedValueOnce(new WarehouseExportError('Missing', 404))
      .mockRejectedValueOnce(new WarehouseExportError('Conflict', 409))
      .mockResolvedValueOnce({
        ...table(),
        description: 'Someone else created this',
      })
    await expect(service.ensureTable({}, config, 'pageviews')).rejects.toThrow(
      'unused table prefix',
    )
    expect(json).toHaveBeenCalledTimes(3)
  })

  it('loads only a single date partition with no partial-row acceptance', async () => {
    const request = jest.spyOn(service, 'request').mockResolvedValue(
      new Response(null, {
        headers: {
          location:
            'https://bigquery.googleapis.com/upload/bigquery/v2/projects/example-project/jobs?upload_id=123',
        },
      }),
    )
    jest.spyOn(service, 'upload').mockResolvedValue(undefined)
    await service.submitJob(
      {},
      config,
      { kind: 'pageviews', bytes: 12 },
      '2026-10-26',
      'job-1',
    )
    const body = JSON.parse(
      (request.mock.calls[0][2] as RequestInit).body as string,
    )
    expect(body.configuration.load.destinationTable.tableId).toBe(
      'swetrix_abcdefghijkl_pageviews$20261026',
    )
    expect(body.configuration.load.writeDisposition).toBe('WRITE_TRUNCATE')
    expect(body.configuration.load.createDisposition).toBe('CREATE_NEVER')
    expect(body.configuration.load.maxBadRecords).toBe(0)
    expect(body.jobReference).toEqual({
      projectId: config.gcpProjectId,
      location: 'EU',
      jobId: 'job-1',
    })
  })

  it('clears an empty day with a parameterized partition delete', async () => {
    const json = jest.spyOn(service, 'json').mockResolvedValue({})
    await service.submitJob(
      {},
      config,
      { kind: 'custom_events', bytes: 0 },
      '2026-10-26',
      'job-1',
    )
    const body = JSON.parse(
      (json.mock.calls[0][2] as RequestInit).body as string,
    )
    expect(body.configuration.query.query).toBe(
      'DELETE FROM `example-project.analytics.swetrix_abcdefghijkl_custom_events` WHERE event_date = @day',
    )
    expect(
      body.configuration.query.queryParameters[0].parameterValue.value,
    ).toBe('2026-10-26')
  })

  it('recovers an accepted job after the submit response is lost', async () => {
    jest
      .spyOn(service, 'findJob')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: { state: 'RUNNING' } })
    const submit = jest
      .spyOn(service, 'submitJob')
      .mockRejectedValue(new WarehouseExportError('Network timeout'))
    jest.spyOn(service, 'waitForJob').mockResolvedValue({
      status: { state: 'DONE' },
      statistics: { load: { outputRows: '12' } },
    })
    await expect(
      service.loadPartition(
        {},
        config,
        { kind: 'pageviews' },
        '2026-10-26',
        'stable-run',
      ),
    ).resolves.toBe(12)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('does not resubmit a completed job on retry', async () => {
    jest
      .spyOn(service, 'findJob')
      .mockResolvedValue({ status: { state: 'DONE' } })
    const submit = jest.spyOn(service, 'submitJob')
    jest.spyOn(service, 'waitForJob').mockResolvedValue({
      status: { state: 'DONE' },
      statistics: { load: { outputRows: '12' } },
    })
    await service.loadPartition(
      {},
      config,
      { kind: 'pageviews' },
      '2026-10-26',
      'stable-run',
    )
    expect(submit).not.toHaveBeenCalled()
  })

  it('keeps the same job identity when persisted progress changes between retries', async () => {
    const find = jest
      .spyOn(service, 'findJob')
      .mockResolvedValue({ status: { state: 'DONE' } })
    jest
      .spyOn(service, 'waitForJob')
      .mockResolvedValue({ status: { state: 'DONE' } })
    await service.loadPartition(
      {},
      { ...config, nextDate: '2026-10-25', status: 'running' },
      { kind: 'pageviews' },
      '2026-10-26',
      'stable-run',
    )
    await service.loadPartition(
      {},
      {
        ...config,
        nextDate: '2026-10-26',
        status: 'error',
        lastSyncedAt: new Date(),
      },
      { kind: 'pageviews' },
      '2026-10-26',
      'stable-run',
    )
    expect(find.mock.calls[0][2]).toBe(find.mock.calls[1][2])
  })

  it('rejects upload session URLs outside the fixed Google hosts', () => {
    expect(
      service.isGoogleUploadUrl(
        'http://bigquery.googleapis.com/upload/bigquery/jobs',
      ),
    ).toBe(false)
    expect(
      service.isGoogleUploadUrl(
        'https://bigquery.googleapis.com.evil.test/upload/bigquery/jobs',
      ),
    ).toBe(false)
    expect(
      service.isGoogleUploadUrl(
        'https://token@bigquery.googleapis.com/upload/bigquery/jobs',
      ),
    ).toBe(false)
    expect(
      service.isGoogleUploadUrl(
        'https://www.googleapis.com/upload/bigquery/v2/projects/test/jobs?upload_id=1',
      ),
    ).toBe(true)
  })

  it('resumes from the server acknowledged byte offset', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'swetrix-export-test-'))
    const path = join(directory, 'rows.ndjson')
    await writeFile(path, '1234567890')
    const request = jest
      .spyOn(service, 'request')
      .mockRejectedValueOnce(new WarehouseExportError('Timeout'))
      .mockResolvedValueOnce(
        new Response(null, { status: 308, headers: { range: 'bytes=0-3' } }),
      )
      .mockResolvedValueOnce(new Response('{}'))
    try {
      await service.upload(
        {},
        'https://bigquery.googleapis.com/upload/bigquery/v2/test',
        { path, bytes: 10 },
      )
      expect(
        new Headers((request.mock.calls[1][2] as RequestInit).headers).get(
          'content-range',
        ),
      ).toBe('bytes */10')
      expect(
        new Headers((request.mock.calls[2][2] as RequestInit).headers).get(
          'content-range',
        ),
      ).toBe('bytes 4-9/10')
      expect(
        new Headers((request.mock.calls[2][2] as RequestInit).headers).get(
          'content-length',
        ),
      ).toBe('6')
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it('never exposes provider response content in errors', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response('secret private_key=PRIVATE', { status: 403 }),
      )
    const auth = {
      getRequestHeaders: async () =>
        new Headers({ authorization: 'Bearer secret' }),
    }
    await expect(
      service.request(
        auth,
        'https://bigquery.googleapis.com/bigquery/v2/test',
        {},
      ),
    ).rejects.toThrow('access was denied')
    try {
      await service.request(
        auth,
        'https://bigquery.googleapis.com/bigquery/v2/test',
        {},
      )
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain('PRIVATE')
    }
  })

  it.each([
    'https://attacker.invalid/bigquery/v2/projects/test/jobs',
    'http://bigquery.googleapis.com/bigquery/v2/projects/test/jobs',
    'https://bigquery.googleapis.com.attacker.invalid/bigquery/v2/test',
    'https://bigquery.googleapis.com@attacker.invalid/bigquery/v2/test',
    'https://attacker@bigquery.googleapis.com/bigquery/v2/test',
    'https://bigquery.googleapis.com:8443/bigquery/v2/test',
    'http://169.254.169.254/latest/meta-data/',
    'https://127.0.0.1/bigquery/v2/test',
    'https://[::1]/bigquery/v2/test',
    '//bigquery.googleapis.com/bigquery/v2/test',
    'file:///etc/passwd',
    'https://www.googleapis.com/storage/v1/b',
    'https://bigquery.googleapis.com/bigquery/v2/../../../other-api',
    'https://bigquery.googleapis.com/bigquery/v2/%2f%2fattacker.invalid',
    'https://bigquery.googleapis.com/bigquery/v2/%252f%252fattacker.invalid',
    'https://bigquery.googleapis.com/bigquery/v2/test#fragment',
    'https://bigquery.googleapis.com\n/bigquery/v2/test',
    'https://bigquery.googleapis.com\\bigquery\\v2\\test',
    'not-a-url',
  ])(
    'rejects unsafe request targets before authentication: %s',
    async (url) => {
      const fetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('{}'))
      const auth = {
        getRequestHeaders: jest
          .fn()
          .mockResolvedValue(new Headers({ authorization: 'Bearer secret' })),
      }
      await expect(service.request(auth, url, {})).rejects.toThrow(
        'Invalid BigQuery request URL',
      )
      expect(auth.getRequestHeaders).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it.each([
    'https://bigquery.googleapis.com/bigquery/v2/projects/example-project/datasets/analytics',
    'https://bigquery.googleapis.com/bigquery/v2/projects/example-project/datasets/analytics/tables/swetrix_pageviews',
    'https://bigquery.googleapis.com/bigquery/v2/projects/example-project/jobs/swetrix_123?location=EU',
    'https://bigquery.googleapis.com/upload/bigquery/v2/projects/example-project/jobs?uploadType=resumable',
    'https://www.googleapis.com/upload/bigquery/v2/projects/example-project/jobs?upload_id=opaque%2Btoken%2Fid&upload_protocol=resumable',
    'https://bigquery.googleapis.com/resumable/upload/bigquery/v2/projects/example-project/jobs?upload_id=opaque%3D',
  ])(
    'keeps supported API and upload requests on fixed Google origins: %s',
    async (url) => {
      const fetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('{}'))
      const auth = {
        getRequestHeaders: jest
          .fn()
          .mockResolvedValue(new Headers({ authorization: 'Bearer secret' })),
      }
      await service.request(auth, url, { redirect: 'follow' })
      const [target, options] = fetch.mock.calls[0]
      expect(target).toBeInstanceOf(URL)
      expect(String(target)).toBe(url)
      expect(new Headers(options.headers).get('authorization')).toBe(
        'Bearer secret',
      )
      expect(options.redirect).toBe('error')
    },
  )

  it('does not follow redirects to an external host', async () => {
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.invalid/token' },
      }),
    )
    const auth = { getRequestHeaders: async () => new Headers() }
    await expect(
      service.request(
        auth,
        'https://bigquery.googleapis.com/bigquery/v2/test',
        {},
      ),
    ).rejects.toThrow('BigQuery could not complete the request')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].redirect).toBe('error')
  })

  it('uploads large files as bounded chunks aligned to Google requirements', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'swetrix-export-test-'))
    const path = join(directory, 'rows.ndjson')
    const chunk = 8 * 1024 * 1024
    await writeFile(path, Buffer.alloc(chunk + 5))
    const request = jest
      .spyOn(service, 'request')
      .mockResolvedValueOnce(
        new Response(null, {
          status: 308,
          headers: { range: `bytes=0-${chunk - 1}` },
        }),
      )
      .mockResolvedValueOnce(new Response('{}'))
    try {
      await service.upload(
        {},
        'https://bigquery.googleapis.com/upload/bigquery/v2/test',
        { path, bytes: chunk + 5 },
      )
      expect(
        new Headers((request.mock.calls[0][2] as RequestInit).headers).get(
          'content-range',
        ),
      ).toBe(`bytes 0-${chunk - 1}/${chunk + 5}`)
      expect(
        new Headers((request.mock.calls[1][2] as RequestInit).headers).get(
          'content-range',
        ),
      ).toBe(`bytes ${chunk}-${chunk + 4}/${chunk + 5}`)
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it('whitelists key fields and discards custom credential URLs and impersonation', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const credentials = {
      type: 'service_account',
      project_id: config.gcpProjectId,
      client_email: 'warehouse@example-project.iam.gserviceaccount.com',
      private_key: privateKey
        .export({ format: 'pem', type: 'pkcs8' })
        .toString(),
    }
    expect(
      parseServiceAccountCredentials({
        ...credentials,
        token_uri: 'https://attacker.invalid/token',
        universe_domain: 'attacker.invalid',
        subject: 'someone@example.org',
      }),
    ).toEqual(credentials)
    expect(() =>
      parseServiceAccountCredentials({
        ...credentials,
        private_key: 'invalid',
      }),
    ).toThrow('valid Google service account')
  })
})
