import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { createClient } from '@clickhouse/client'
import { ConflictException } from '@nestjs/common'
import { getIdempotencyRequest } from '../common/idempotency'
import { createIdempotently } from './create-idempotency'

jest.mock('../common/integrations/clickhouse', () => ({
  get clickhouse() {
    return db
  },
}))
jest.mock('../common/utils', () => ({ deriveKey: () => 'ff'.repeat(32) }))

const {
  createReceiptTable,
} = require('../../../../migrations/clickhouse/selfhosted_2026_11_04_admin_idempotency')
const url = process.env.SWETRIX_IDEMPOTENCY_TEST_CLICKHOUSE_URL
const suite = url ? describe : describe.skip
let db: ReturnType<typeof createClient>

suite('Community idempotency against ClickHouse', () => {
  const projectId = 'test00000001'
  const target = { table: 'annotation' as const, projectId }

  beforeAll(async () => {
    const endpoint = new URL(url)
    if (endpoint.pathname !== '/' || endpoint.search || endpoint.hash)
      throw new Error(
        'Use a plain ClickHouse HTTP test URL. All writes must use the idempotency_test database.',
      )
    db = createClient({ url, database: 'idempotency_test' })
    const database = await (
      await db.query({ query: 'SELECT currentDatabase() AS db' })
    ).json<{ db: string }>()
    expect(database.data[0].db).toBe('idempotency_test')
    await db.command({ query: createReceiptTable('idempotency_test') })
    await db.command({
      query:
        'CREATE TABLE IF NOT EXISTS idempotency_test.annotation (id FixedString(36), projectId FixedString(12), text String) ENGINE = MergeTree ORDER BY id',
    })
    process.env.SECRET_KEY_BASE = 'idempotency-test'
  })
  afterAll(async () => {
    await db?.close()
  })

  function run(
    key: string,
    text: string,
    insert?: (id: string) => Promise<void>,
  ) {
    const data = { id: randomUUID(), projectId, text }
    const req = getIdempotencyRequest('live-test', 'create_annotation', key, {
      text,
    })
    return createIdempotently(req, target, data, async () => {
      await db.insert({
        table: 'annotation',
        format: 'JSONEachRow',
        values: [data],
        clickhouse_settings: { async_insert: 0, wait_end_of_query: 1 },
      })
      await insert?.(data.id)
    })
  }

  async function rows(text: string) {
    return (
      await (
        await db.query({
          query: 'SELECT id FROM annotation WHERE text = {text:String}',
          query_params: { text },
        })
      ).json<{ id: string }>()
    ).data
  }

  it('rejects concurrent claims and applies a matching retry exactly once', async () => {
    const key = randomUUID()
    const text = randomUUID()
    const { requestId } = getIdempotencyRequest(
      'live-test',
      'create_annotation',
      key,
      { text },
    )
    const queryId = `live-lock-${randomUUID()}`
    const lock = db
      .query({
        query: 'SELECT sleep(2)',
        session_id: `swetrix-admin-create-${requestId}`,
        query_id: queryId,
      })
      .then((result) => result.json())
    for (let i = 0; i < 40; i++) {
      const active = await (
        await db.query({
          query: 'SELECT 1 FROM system.processes WHERE query_id = {id:String}',
          query_params: { id: queryId },
        })
      ).json()
      if (active.data.length) break
      await delay(20)
    }
    try {
      await expect(run(key, text)).rejects.toBeInstanceOf(ConflictException)
    } finally {
      await lock
    }

    const attempts = await Promise.allSettled([run(key, text), run(key, text)])
    expect(
      attempts.filter((result) => result.status === 'fulfilled').length,
    ).toBeGreaterThan(0)
    const original = await run(key, text)
    expect(await rows(text)).toEqual([{ id: original.id }])
    await expect(run(key, 'changed-' + text)).rejects.toThrow(
      /different request body/,
    )
    expect(await rows('changed-' + text)).toEqual([])
  }, 30000)

  it('allows only one payload when different creates race for a fresh key', async () => {
    const key = randomUUID()
    const names = [randomUUID(), randomUUID()]
    const calls = await Promise.allSettled(names.map((text) => run(key, text)))
    const successful = calls.filter((value) => value.status === 'fulfilled')
    expect(successful).toHaveLength(1)
    const winner = successful[0].value
    const loser = names.find((name) => name !== winner.text)
    await expect(run(key, loser)).rejects.toThrow(/different request body/)
    expect(await rows(winner.text)).toEqual([{ id: winner.id }])
    expect(await rows(loser)).toEqual([])
  })

  it('recovers a committed insert after an acknowledgement failure and returns the reserved response', async () => {
    const key = randomUUID()
    const text = randomUUID()
    let created: string
    await expect(
      run(key, text, async (id) => {
        created = id
        throw new Error('lost response')
      }),
    ).rejects.toThrow('lost response')
    expect(await run(key, text)).toEqual({ id: created, projectId, text })
    expect(await rows(text)).toEqual([{ id: created }])
  })
})
