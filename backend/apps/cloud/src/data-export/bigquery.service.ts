import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { setTimeout as sleep } from 'timers/promises'
import { JWT } from 'google-auth-library'

import {
  assertBigQueryConfig,
  assertWarehouseDay,
  BigQueryConfig,
  ServiceAccountCredentials,
  WarehouseExportError,
  WarehouseField,
  WarehouseKind,
  WAREHOUSE_KINDS,
  WAREHOUSE_SCHEMA,
} from './data-export.schema'
import {
  WarehouseFile,
  WarehouseSourceService,
} from './warehouse-source.service'

const API = 'https://bigquery.googleapis.com/bigquery/v2'
const UPLOAD_API = 'https://bigquery.googleapis.com/upload/bigquery/v2'
const REQUEST_TIMEOUT = 120_000
const JOB_TIMEOUT = 15 * 60_000
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024

interface BigQueryJob {
  status?: {
    state?: string
    errorResult?: { reason?: string }
  }
  statistics?: { load?: { outputRows?: string } }
}

@Injectable()
export class BigQueryService {
  constructor(private readonly source: WarehouseSourceService) {}

  async validate(
    config: BigQueryConfig,
    credentials: ServiceAccountCredentials,
  ) {
    assertBigQueryConfig(config)
    const auth = this.auth(credentials)
    const dataset = await this.json<{ location?: string }>(
      auth,
      `${API}/${this.datasetPath(config)}`,
    )
    if (dataset.location?.toLowerCase() !== config.location.toLowerCase()) {
      throw new WarehouseExportError(
        'The dataset location does not match the selected location.',
      )
    }
    await this.json(auth, `${API}/projects/${config.gcpProjectId}/jobs`, {
      method: 'POST',
      body: JSON.stringify({
        jobReference: {
          projectId: config.gcpProjectId,
          location: config.location,
        },
        configuration: {
          dryRun: true,
          query: { query: 'SELECT 1', useLegacySql: false },
        },
      }),
    })
    for (const kind of WAREHOUSE_KINDS) {
      await this.ensureTable(auth, config, kind)
    }
  }

  async exportDay(
    config: BigQueryConfig,
    credentials: ServiceAccountCredentials,
    day: string,
    runId: string,
    signal?: AbortSignal,
  ): Promise<number> {
    assertBigQueryConfig(config)
    assertWarehouseDay(day)
    const auth = this.auth(credentials)
    const exported = await this.source.exportDay(config.projectId, day, signal)
    try {
      let rows = 0
      for (const file of exported.files) {
        signal?.throwIfAborted()
        await this.ensureTable(auth, config, file.kind, signal)
        rows += await this.loadPartition(auth, config, file, day, runId, signal)
      }
      return rows
    } finally {
      await exported.cleanup()
    }
  }

  private auth(credentials: ServiceAccountCredentials) {
    return new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/bigquery'],
      transporterOptions: { timeout: 30_000, retry: false },
    })
  }

  private datasetPath(config: BigQueryConfig) {
    return `projects/${config.gcpProjectId}/datasets/${config.datasetId}`
  }

  private description(config: BigQueryConfig, kind: WarehouseKind) {
    return `Swetrix warehouse export v1; project=${config.projectId}; kind=${kind}`
  }

  private async ensureTable(
    auth: JWT,
    config: BigQueryConfig,
    kind: WarehouseKind,
    signal?: AbortSignal,
  ) {
    const tableId = `${config.tablePrefix}_${kind}`
    const path = `${API}/${this.datasetPath(config)}/tables/${tableId}`
    let table: any
    try {
      table = await this.json(auth, path, {}, signal)
    } catch (error) {
      if (!(error instanceof WarehouseExportError) || error.status !== 404)
        throw error
      try {
        await this.json(
          auth,
          `${API}/${this.datasetPath(config)}/tables`,
          {
            method: 'POST',
            body: JSON.stringify({
              tableReference: {
                projectId: config.gcpProjectId,
                datasetId: config.datasetId,
                tableId,
              },
              description: this.description(config, kind),
              schema: { fields: WAREHOUSE_SCHEMA },
              timePartitioning: { type: 'DAY', field: 'event_date' },
            }),
          },
          signal,
        )
      } catch (createError) {
        if (
          !(createError instanceof WarehouseExportError) ||
          createError.status !== 409
        ) {
          throw createError
        }
      }
      table = await this.json(auth, path, {}, signal)
    }
    if (
      table.type !== 'TABLE' ||
      table.description !== this.description(config, kind) ||
      table.timePartitioning?.type !== 'DAY' ||
      table.timePartitioning?.field !== 'event_date' ||
      !this.schemaMatches(table.schema?.fields, WAREHOUSE_SCHEMA)
    ) {
      throw new WarehouseExportError(
        'The destination tables are not compatible Swetrix export tables. Choose an unused table prefix.',
      )
    }
  }

  private schemaMatches(
    actual: WarehouseField[] | undefined,
    expected: WarehouseField[],
  ): boolean {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((field) => {
        const found = actual.find((candidate) => candidate.name === field.name)
        return (
          found?.type === field.type &&
          (found.mode || 'NULLABLE') === field.mode &&
          (!field.fields || this.schemaMatches(found.fields, field.fields))
        )
      })
    )
  }

  private async loadPartition(
    auth: JWT,
    config: BigQueryConfig,
    file: WarehouseFile,
    day: string,
    runId: string,
    signal?: AbortSignal,
  ): Promise<number> {
    const digest = createHash('sha256')
      .update(
        JSON.stringify([
          config.projectId,
          config.gcpProjectId,
          config.datasetId,
          config.location,
          config.tablePrefix,
          day,
          file.kind,
          runId,
        ]),
      )
      .digest('hex')
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const jobId = `swetrix_${digest}_${attempt}`
      let job = await this.findJob(auth, config, jobId, signal)
      if (!job) {
        try {
          await this.submitJob(auth, config, file, day, jobId, signal)
        } catch (error) {
          job = await this.findJob(auth, config, jobId, signal)
          if (!job) throw error
        }
      }
      job = await this.waitForJob(auth, config, jobId, signal)
      if (!job.status?.errorResult) {
        return Number(job.statistics?.load?.outputRows || 0)
      }
      const reason = job.status.errorResult.reason
      if (
        ![
          'backendError',
          'internalError',
          'rateLimitExceeded',
          'jobRateLimitExceeded',
        ].includes(reason)
      ) {
        throw new WarehouseExportError(
          'BigQuery rejected the export job. Check destination permissions, schema and quotas, then retry.',
        )
      }
      await sleep(1000 * 2 ** attempt, undefined, { signal })
    }
    throw new WarehouseExportError(
      'BigQuery is temporarily unavailable or rate limited. Retry the export later.',
    )
  }

  private async submitJob(
    auth: JWT,
    config: BigQueryConfig,
    file: WarehouseFile,
    day: string,
    jobId: string,
    signal?: AbortSignal,
  ) {
    const tableId = `${config.tablePrefix}_${file.kind}`
    const jobReference = {
      projectId: config.gcpProjectId,
      location: config.location,
      jobId,
    }
    if (file.bytes === 0) {
      await this.json(
        auth,
        `${API}/projects/${config.gcpProjectId}/jobs`,
        {
          method: 'POST',
          body: JSON.stringify({
            jobReference,
            configuration: {
              jobTimeoutMs: String(JOB_TIMEOUT),
              query: {
                query: `DELETE FROM \`${config.gcpProjectId}.${config.datasetId}.${tableId}\` WHERE event_date = @day`,
                useLegacySql: false,
                parameterMode: 'NAMED',
                queryParameters: [
                  {
                    name: 'day',
                    parameterType: { type: 'DATE' },
                    parameterValue: { value: day },
                  },
                ],
              },
            },
          }),
        },
        signal,
      )
      return
    }

    const response = await this.request(
      auth,
      `${UPLOAD_API}/projects/${config.gcpProjectId}/jobs?uploadType=resumable`,
      {
        method: 'POST',
        headers: {
          'x-upload-content-type': 'application/octet-stream',
          'x-upload-content-length': String(file.bytes),
        },
        body: JSON.stringify({
          jobReference,
          configuration: {
            jobTimeoutMs: String(JOB_TIMEOUT),
            load: {
              destinationTable: {
                projectId: config.gcpProjectId,
                datasetId: config.datasetId,
                tableId: `${tableId}$${day.replace(/-/g, '')}`,
              },
              sourceFormat: 'NEWLINE_DELIMITED_JSON',
              schema: { fields: WAREHOUSE_SCHEMA },
              createDisposition: 'CREATE_NEVER',
              writeDisposition: 'WRITE_TRUNCATE',
              maxBadRecords: 0,
              ignoreUnknownValues: false,
            },
          },
        }),
      },
      signal,
    )
    const location = response.headers.get('location')
    await response.body?.cancel()
    if (!location || !this.isGoogleUploadUrl(location)) {
      throw new WarehouseExportError(
        'BigQuery returned an invalid upload session. Retry the export.',
      )
    }
    await this.upload(auth, location, file, signal)
  }

  private isGoogleUploadUrl(value: string) {
    try {
      const url = new URL(value)
      return (
        url.protocol === 'https:' &&
        ['bigquery.googleapis.com', 'www.googleapis.com'].includes(
          url.hostname,
        ) &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === '443') &&
        (url.pathname.startsWith('/upload/bigquery/') ||
          url.pathname.startsWith('/resumable/upload/bigquery/'))
      )
    } catch {
      return false
    }
  }

  private async upload(
    auth: JWT,
    url: string,
    file: WarehouseFile,
    signal?: AbortSignal,
  ) {
    let offset = 0
    let failures = 0
    while (failures < 5) {
      const previousOffset = offset
      const end = Math.min(offset + UPLOAD_CHUNK_BYTES, file.bytes) - 1
      const stream = createReadStream(file.path, { start: offset, end })
      try {
        const response = await this.request(
          auth,
          url,
          {
            method: 'PUT',
            headers: {
              'content-type': 'application/octet-stream',
              'content-length': String(end - offset + 1),
              'content-range': `bytes ${offset}-${end}/${file.bytes}`,
            },
            body: stream as unknown as BodyInit,
            duplex: 'half',
          } as RequestInit,
          signal,
          true,
        )
        await response.body?.cancel()
        if (response.status !== 308) return
        offset = this.uploadOffset(response, file.bytes)
      } catch (error) {
        if (signal?.aborted) throw error
        if (
          error instanceof WarehouseExportError &&
          error.status &&
          error.status < 500 &&
          error.status !== 429
        ) {
          throw error
        }
        await sleep(1000 * 2 ** failures, undefined, { signal })
        const status = await this.request(
          auth,
          url,
          {
            method: 'PUT',
            headers: {
              'content-length': '0',
              'content-range': `bytes */${file.bytes}`,
            },
          },
          signal,
          true,
        )
        await status.body?.cancel()
        if (status.status !== 308) return
        offset = this.uploadOffset(status, file.bytes)
      } finally {
        stream.destroy()
      }
      failures = offset > previousOffset ? 0 : failures + 1
    }
    throw new WarehouseExportError(
      'The BigQuery upload was interrupted. Retry the export.',
    )
  }

  private uploadOffset(response: Response, size: number) {
    const range = response.headers.get('range')
    const match = range?.match(/^(?:bytes=)?0-(\d+)$/)
    const offset = match ? Number(match[1]) + 1 : 0
    if (
      (range && !match) ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset >= size
    ) {
      throw new WarehouseExportError(
        'BigQuery returned an invalid upload offset. Retry the export.',
      )
    }
    return offset
  }

  private async findJob(
    auth: JWT,
    config: BigQueryConfig,
    id: string,
    signal?: AbortSignal,
  ) {
    try {
      return await this.json<BigQueryJob>(
        auth,
        this.jobUrl(config, id),
        {},
        signal,
      )
    } catch (error) {
      if (error instanceof WarehouseExportError && error.status === 404)
        return null
      throw error
    }
  }

  private jobUrl(config: BigQueryConfig, id: string) {
    return `${API}/projects/${config.gcpProjectId}/jobs/${id}?location=${encodeURIComponent(config.location)}`
  }

  private async waitForJob(
    auth: JWT,
    config: BigQueryConfig,
    id: string,
    signal?: AbortSignal,
  ) {
    const deadline = Date.now() + JOB_TIMEOUT
    while (Date.now() < deadline) {
      const job = await this.findJob(auth, config, id, signal)
      if (job?.status?.state === 'DONE') return job
      await sleep(1500, undefined, { signal })
    }
    throw new WarehouseExportError(
      'BigQuery is still processing this export. Retry to resume checking the job.',
    )
  }

  private async json<T = unknown>(
    auth: JWT,
    url: string,
    init: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await this.request(auth, url, init, signal)
    try {
      return (await response.json()) as T
    } catch {
      throw new WarehouseExportError(
        'BigQuery returned an invalid response. Retry the export.',
      )
    }
  }

  private async request(
    auth: JWT,
    url: string,
    init: RequestInit,
    signal?: AbortSignal,
    allowIncomplete = false,
  ) {
    let target: URL
    try {
      target = new URL(url)
    } catch {
      throw new WarehouseExportError('Invalid BigQuery request URL.', 400)
    }
    const isUpload =
      target.pathname.startsWith('/upload/bigquery/v2/') ||
      target.pathname.startsWith('/resumable/upload/bigquery/v2/')
    if (
      target.protocol !== 'https:' ||
      (target.hostname !== 'bigquery.googleapis.com' &&
        target.hostname !== 'www.googleapis.com') ||
      target.port ||
      target.username ||
      target.password ||
      target.hash ||
      !/^[\x21-\x7e]+$/.test(url) ||
      url.includes('\\') ||
      !/^\/[A-Za-z0-9_/-]+$/.test(target.pathname) ||
      (!isUpload &&
        (target.hostname !== 'bigquery.googleapis.com' ||
          !target.pathname.startsWith('/bigquery/v2/')))
    ) {
      throw new WarehouseExportError('Invalid BigQuery request URL.', 400)
    }
    const requestUrl = new URL(
      target.hostname === 'bigquery.googleapis.com'
        ? 'https://bigquery.googleapis.com'
        : 'https://www.googleapis.com',
    )
    requestUrl.pathname = target.pathname
    requestUrl.search = target.search

    let headers: Headers
    try {
      headers = await auth.getRequestHeaders()
    } catch {
      throw new WarehouseExportError(
        'Google authentication failed. Replace the service account key and check that it is active.',
      )
    }
    new Headers(init.headers).forEach((value, key) => headers.set(key, value))
    if (!headers.has('content-type'))
      headers.set('content-type', 'application/json')
    let response: Response
    try {
      response = await fetch(requestUrl, {
        ...init,
        headers,
        redirect: 'error',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)])
          : AbortSignal.timeout(REQUEST_TIMEOUT),
      })
    } catch {
      throw new WarehouseExportError(
        'Unable to reach BigQuery. Retry the export.',
      )
    }
    if (!response.ok && !(allowIncomplete && response.status === 308)) {
      await response.body?.cancel()
      const message =
        response.status === 401 || response.status === 403
          ? 'BigQuery access was denied. Check the service account key, dataset Data Editor role and project Job User role.'
          : response.status === 404
            ? 'The BigQuery dataset or resource was not found. Check the project, dataset and location.'
            : response.status === 429
              ? 'BigQuery is rate limited. Retry the export later.'
              : 'BigQuery could not complete the request. Check the destination settings and retry.'
      throw new WarehouseExportError(message, response.status)
    }
    return response
  }
}
