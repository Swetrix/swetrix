jest.mock('../common/utils', () => ({ isPrimaryClusterNode: () => true }))

import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ConflictException } from '@nestjs/common'
import { DataSource, EntityManager } from 'typeorm'
import { getIdempotencyRequest } from '../common/idempotency'
import { IdempotentCreateService } from './idempotent-create.service'

const url = process.env.SWETRIX_IDEMPOTENCY_TEST_MYSQL_URL

;(url ? describe : describe.skip)('MySQL create idempotency', () => {
  const fixture = 'idempotency_test_' + randomUUID().replaceAll('-', '')
  const owner = randomUUID()
  const requests: string[] = []
  let db: DataSource
  let service: IdempotentCreateService

  function receipt(key: string, text: string) {
    const request = getIdempotencyRequest(owner, 'create_annotation', key, {
      text,
    })
    requests.push(request.requestId)
    return request
  }
  async function insert(manager: EntityManager, text: string) {
    const result = await manager.query(
      `INSERT INTO ${fixture} (text) VALUES (?)`,
      [text],
    )
    return { id: result.insertId, text }
  }
  async function count(text: string) {
    const [row] = await db.query(
      `SELECT COUNT(*) AS total FROM ${fixture} WHERE text = ?`,
      [text],
    )
    return Number(row.total)
  }

  beforeAll(async () => {
    if (!/^\/[A-Za-z0-9_]+_idempotency_test$/.test(new URL(url).pathname)) {
      throw new Error(
        'Use a dedicated MySQL database with a name ending in _idempotency_test.',
      )
    }
    db = await new DataSource({ type: 'mysql', url }).initialize()
    const migration = await readFile(
      resolve(
        __dirname,
        '../../../../migrations/mysql/2026_11_04_admin_create_receipts.sql',
      ),
      'utf8',
    )
    await db.query(migration)
    await db.query(
      `CREATE TABLE ${fixture} (id INT AUTO_INCREMENT PRIMARY KEY, text VARCHAR(100)) ENGINE=InnoDB`,
    )
    service = new IdempotentCreateService(db)
  }, 30_000)

  afterAll(async () => {
    if (!db?.isInitialized) return
    try {
      await db.query(`DROP TABLE IF EXISTS ${fixture}`)
      if (requests.length)
        await db.query(
          'DELETE FROM admin_create_receipt WHERE requestId IN (?)',
          [requests],
        )
    } finally {
      await db.destroy()
    }
  })

  it('serializes parallel callers and replays a committed write after a lost response', async () => {
    const request = receipt('concurrent', 'launch')
    const create = jest.fn(async (manager: EntityManager) => {
      const value = await insert(manager, 'launch')
      await manager.query('SELECT SLEEP(0.05)')
      return value
    })
    const results = await Promise.all(
      Array.from({ length: 4 }, () => service.run(request, create)),
    )
    expect(create).toHaveBeenCalledTimes(1)
    expect(results.filter((item) => item.created)).toHaveLength(1)
    expect(results.every((item) => item.value.id === results[0].value.id)).toBe(
      true,
    )
    expect(await count('launch')).toBe(1)
    await expect(
      new IdempotentCreateService(db).run(request, create),
    ).resolves.toEqual({ value: results[0].value, created: false })
    await expect(
      service.run(receipt('concurrent', 'changed'), create),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('rolls the resource back if its response cannot be recorded, then allows a clean retry', async () => {
    const request = receipt('failure', 'rollback')
    await expect(
      service.run(request, async (manager) => {
        await insert(manager, 'rollback')
        return { unserializable: 1n }
      }),
    ).rejects.toThrow()
    expect(await count('rollback')).toBe(0)
    const [row] = await db.query(
      'SELECT COUNT(*) AS total FROM admin_create_receipt WHERE requestId = ?',
      [request.requestId],
    )
    expect(Number(row.total)).toBe(0)
    const retry = await service.run(request, (manager) =>
      insert(manager, 'rollback'),
    )
    expect(retry.created).toBe(true)
    expect(await count('rollback')).toBe(1)
  })

  it('can reuse an expired key for a new payload before the cleanup job runs', async () => {
    const request = receipt('expiry', 'old')
    await service.run(request, (manager) => insert(manager, 'old'))
    await db.query(
      'UPDATE admin_create_receipt SET expiresAt = UTC_TIMESTAMP(6) - INTERVAL 1 SECOND WHERE requestId = ?',
      [request.requestId],
    )
    await expect(
      service.run(receipt('expiry', 'new'), (manager) =>
        insert(manager, 'new'),
      ),
    ).resolves.toMatchObject({ created: true, value: { text: 'new' } })
    expect(await count('new')).toBe(1)
  })
})
