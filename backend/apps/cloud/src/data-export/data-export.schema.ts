import { BadRequestException } from '@nestjs/common'
import { createPrivateKey } from 'crypto'

export class WarehouseExportError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'WarehouseExportError'
  }
}

export type WarehouseKind = 'pageviews' | 'custom_events'

export interface BigQueryConfig {
  projectId: string
  gcpProjectId: string
  datasetId: string
  location: string
  tablePrefix: string
}

export interface ServiceAccountCredentials {
  type: 'service_account'
  project_id: string
  client_email: string
  private_key: string
}

export interface WarehouseField {
  name: string
  type: string
  mode: 'REQUIRED' | 'NULLABLE' | 'REPEATED'
  fields?: WarehouseField[]
}

export const WAREHOUSE_KINDS: WarehouseKind[] = ['pageviews', 'custom_events']

export const WAREHOUSE_STRING_COLUMNS = {
  project_id: 'pid',
  event_type: 'type',
  visitor_id: 'toString(psid)',
  session_id: 'toString(sid)',
  profile_id: 'profileId',
  hostname: 'host',
  page_path: 'pg',
  page_title: 'title',
  device: 'dv',
  browser: 'br',
  browser_version: 'brv',
  os: 'os',
  os_version: 'osv',
  language: 'lc',
  referrer: 'ref',
  utm_source: 'so',
  utm_medium: 'me',
  utm_campaign: 'ca',
  utm_term: 'te',
  utm_content: 'co',
  country_code: 'cc',
  region: 'rg',
  region_code: 'rgc',
  city: 'ct',
  event_name: 'event_name',
  outbound_url: 'outbound_url',
} as const

export const WAREHOUSE_SCHEMA: WarehouseField[] = [
  { name: 'event_date', type: 'DATE', mode: 'REQUIRED' },
  { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
  ...Object.keys(WAREHOUSE_STRING_COLUMNS).map((name) => ({
    name,
    type: 'STRING',
    mode: 'NULLABLE' as const,
  })),
  {
    name: 'metadata',
    type: 'RECORD',
    mode: 'REPEATED',
    fields: [
      { name: 'key', type: 'STRING', mode: 'NULLABLE' },
      { name: 'value', type: 'STRING', mode: 'NULLABLE' },
    ],
  },
]

export function parseServiceAccountCredentials(
  value: unknown,
): ServiceAccountCredentials {
  let input: any
  try {
    input = typeof value === 'string' ? JSON.parse(value) : value
    if (
      !input ||
      input.type !== 'service_account' ||
      typeof input.project_id !== 'string' ||
      !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(input.project_id) ||
      typeof input.client_email !== 'string' ||
      !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.iam\.gserviceaccount\.com$/.test(
        input.client_email,
      ) ||
      typeof input.private_key !== 'string' ||
      input.private_key.length > 16000 ||
      createPrivateKey(input.private_key).asymmetricKeyType !== 'rsa'
    ) {
      throw new Error('Invalid service account')
    }
  } catch {
    throw new BadRequestException(
      'Provide a valid Google service account JSON key.',
    )
  }
  return {
    type: 'service_account',
    project_id: input.project_id,
    client_email: input.client_email,
    private_key: input.private_key,
  }
}

export function assertWarehouseDay(day: string): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(`${day}T00:00:00.000Z`)) ||
    new Date(`${day}T00:00:00.000Z`).toISOString().slice(0, 10) !== day
  ) {
    throw new BadRequestException('Use a valid date in YYYY-MM-DD format.')
  }
}

export function assertBigQueryConfig(config: BigQueryConfig): void {
  if (
    !/^(?!.*--)[a-zA-Z0-9-]{12}$/.test(config.projectId) ||
    !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(config.gcpProjectId) ||
    !/^[a-zA-Z0-9_]{1,1024}$/.test(config.datasetId) ||
    !/^[a-zA-Z_][a-zA-Z0-9_]{0,100}$/.test(config.tablePrefix) ||
    !/^[a-zA-Z0-9-]{2,40}$/.test(config.location)
  ) {
    throw new BadRequestException('Invalid BigQuery destination settings.')
  }
}
