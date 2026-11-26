import { ConflictException, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { encryptApiKey, decryptApiKey } from '../api-key/api-key.crypto'
import { IdempotencyRequest } from '../common/idempotency'
import { clickhouse } from '../common/integrations/clickhouse'

interface Receipt {
  fingerprint: string
  attempt: string
  response: string
  completed: number
}

type Target =
  | { table: 'project'; userId: string }
  | { table: 'funnel' | 'annotation'; projectId: string }

const synchronousWrite = {
  async_insert: 0,
  wait_for_async_insert: 1,
  wait_end_of_query: 1,
} as const
const validReceipt =
  'requestId = {requestId:String} AND created > now() - INTERVAL 24 HOUR'

function pending() {
  return new ConflictException(
    'This create is in progress or its outcome could not be confirmed. Retry with the same Idempotency-Key.',
  )
}

async function readReceipt(requestId: string) {
  const result = await clickhouse.query({
    query: `SELECT fingerprint, attempt, response, completed FROM admin_create_receipt
      WHERE ${validReceipt} ORDER BY created DESC, completed DESC LIMIT 1`,
    query_params: { requestId },
    clickhouse_settings: { use_query_cache: 0 },
  })
  return (await result.json<Receipt>()).data[0]
}

async function resourceExists(target: Target, id: string) {
  const isProject = target.table === 'project'
  const result = await clickhouse.query({
    query: `SELECT 1 FROM ${target.table} WHERE id = {id:String}
      AND ${isProject ? 'adminId = {scope:String}' : 'projectId = {scope:String}'} LIMIT 1`,
    query_params: { id, scope: isProject ? target.userId : target.projectId },
    clickhouse_settings: { use_query_cache: 0 },
  })
  return (await result.json()).data.length > 0
}

export async function createIdempotently<T extends { id: string }>(
  request: IdempotencyRequest | undefined,
  target: Target,
  proposed: T,
  insert: () => Promise<void>,
): Promise<T> {
  if (!request) {
    await insert()
    return proposed
  }
  const { requestId, fingerprint } = request
  const attempt = randomUUID()
  let receipt = await readReceipt(requestId)
  if (!receipt) {
    // ClickHouse executes at most one statement per HTTP session, so competing claims cannot use the same snapshot.
    try {
      await clickhouse.command({
        query: `INSERT INTO admin_create_receipt (requestId, fingerprint, attempt, response)
          SELECT {requestId:String}, {fingerprint:String}, {attempt:String}, {response:String}
          WHERE NOT EXISTS (SELECT 1 FROM admin_create_receipt WHERE ${validReceipt})`,
        session_id: `swetrix-admin-create-${requestId}`,
        query_params: {
          requestId,
          fingerprint,
          attempt,
          response: encryptApiKey(
            JSON.stringify(proposed),
            'admin-create-receipt',
            requestId,
          ),
        },
        clickhouse_settings: synchronousWrite,
      })
    } catch (error) {
      if (error?.type === 'SESSION_IS_LOCKED') throw pending()
      throw error
    }
    receipt = await readReceipt(requestId)
  }
  if (!receipt) throw pending()
  if (receipt.fingerprint !== fingerprint) {
    throw new ConflictException(
      'Idempotency-Key was already used with a different request body.',
    )
  }
  const response: T = JSON.parse(
    decryptApiKey(receipt.response, 'admin-create-receipt', requestId),
  )
  if (receipt.attempt === attempt) {
    await insert()
  } else if (!receipt.completed || target.table === 'project') {
    if (!(await resourceExists(target, response.id))) {
      if (receipt.completed) throw new NotFoundException('Project not found.')
      throw pending()
    }
  }
  if (!receipt.completed) {
    await clickhouse.command({
      query: `INSERT INTO admin_create_receipt (requestId, fingerprint, attempt, response, created, completed)
        SELECT requestId, fingerprint, attempt, response, created, 1 FROM admin_create_receipt
        WHERE ${validReceipt} AND attempt = {attempt:String} AND completed = 0 LIMIT 1`,
      query_params: { requestId, attempt: receipt.attempt },
      clickhouse_settings: synchronousWrite,
    })
  }
  return response
}
