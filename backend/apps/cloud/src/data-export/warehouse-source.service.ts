import { BadRequestException, Injectable } from '@nestjs/common'
import { mkdtemp, rm, stat } from 'fs/promises'
import { createWriteStream } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { clickhouse } from '../common/integrations/clickhouse'
import {
  assertWarehouseDay,
  WarehouseKind,
  WAREHOUSE_KINDS,
  WAREHOUSE_STRING_COLUMNS,
  WarehouseExportError,
} from './data-export.schema'

const MAX_EXPORT_BYTES = 10 * 1024 * 1024 * 1024

export type WarehouseRow = Record<string, unknown> & {
  metadata: { key: string; value: string }[]
}

export interface WarehouseFile {
  kind: WarehouseKind
  path: string
  rows: number
  bytes: number
}

@Injectable()
export class WarehouseSourceService {
  async *rows(
    projectId: string,
    day: string,
    kind: WarehouseKind,
    signal?: AbortSignal,
  ): AsyncGenerator<WarehouseRow> {
    assertWarehouseDay(day)
    if (
      !/^(?!.*--)[a-zA-Z0-9-]{12}$/.test(projectId) ||
      !WAREHOUSE_KINDS.includes(kind)
    ) {
      throw new BadRequestException('Invalid export selection.')
    }

    const result = await clickhouse.query({
      query: `SELECT
        toString(toDate(created, 'UTC')) AS event_date,
        formatDateTime(created, '%Y-%m-%dT%H:%i:%SZ', 'UTC') AS timestamp,
        ${Object.entries(WAREHOUSE_STRING_COLUMNS)
          .map(([name, expression]) => `${expression} AS ${name}`)
          .join(', ')},
        \`meta.key\` AS metadata_keys, \`meta.value\` AS metadata_values
        FROM events
        WHERE pid = {projectId:FixedString(12)}
          AND type IN {types:Array(String)}
          AND importID IS NULL
          AND created >= toDateTime({day:Date}, 'UTC')
          AND created < toDateTime({day:Date}, 'UTC') + INTERVAL 1 DAY`,
      query_params: {
        projectId,
        day,
        types:
          kind === 'pageviews' ? ['pageview'] : ['custom_event', 'outbound'],
      },
      format: 'JSONEachRow',
      abort_signal: signal,
      clickhouse_settings: { max_execution_time: 600 },
    })

    try {
      for await (const batch of result.stream<Record<string, any>>()) {
        for (const row of batch) {
          const { metadata_keys, metadata_values, ...data } = row.json()
          yield {
            ...data,
            metadata: (metadata_keys || []).map(
              (key: string, index: number) => ({
                key,
                value: metadata_values?.[index] ?? '',
              }),
            ),
          } as WarehouseRow
        }
      }
    } finally {
      result.close()
    }
  }

  async exportDay(projectId: string, day: string, signal?: AbortSignal) {
    const directory = await mkdtemp(join(tmpdir(), 'swetrix-warehouse-'))
    const files: WarehouseFile[] = []
    const cleanup = () => rm(directory, { recursive: true, force: true })
    let totalBytes = 0

    try {
      for (const kind of WAREHOUSE_KINDS) {
        const path = join(directory, `${kind}.ndjson`)
        let rows = 0
        const source = this.rows(projectId, day, kind, signal)
        const lines = async function* () {
          for await (const row of source) {
            const line = `${JSON.stringify(row)}\n`
            totalBytes += Buffer.byteLength(line)
            if (totalBytes > MAX_EXPORT_BYTES) {
              throw new WarehouseExportError(
                'This day exceeds the 10 GiB export limit. Contact support or use the streaming export API.',
              )
            }
            rows += 1
            yield line
          }
        }
        await pipeline(
          Readable.from(lines()),
          createWriteStream(path, { mode: 0o600, flags: 'wx' }),
          { signal },
        )
        files.push({ kind, path, rows, bytes: (await stat(path)).size })
      }
      return { files, cleanup }
    } catch (error) {
      await cleanup()
      throw error
    }
  }
}
