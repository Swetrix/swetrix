import { ConflictException, Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { DataSource, EntityManager } from 'typeorm'
import type { IdempotencyRequest } from '../common/idempotency'
import { isPrimaryClusterNode } from '../common/utils'

@Injectable()
export class IdempotentCreateService {
  constructor(private readonly db: DataSource) {}

  async run<T>(
    request: IdempotencyRequest | undefined,
    create: (manager?: EntityManager) => Promise<T>,
    authorizeReplay?: (value: T, manager: EntityManager) => Promise<void>,
  ): Promise<{ value: T; created: boolean }> {
    if (!request) return { value: await create(), created: true }

    const { requestId, fingerprint } = request
    return this.db.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO admin_create_receipt (requestId, fingerprint, expiresAt)
         VALUES (?, ?, UTC_TIMESTAMP(6) + INTERVAL 24 HOUR)
         ON DUPLICATE KEY UPDATE requestId = requestId`,
        [requestId, fingerprint],
      )
      const [record] = await manager.query(
        `SELECT fingerprint, response FROM admin_create_receipt
         WHERE requestId = ? AND expiresAt > UTC_TIMESTAMP(6) FOR UPDATE`,
        [requestId],
      )
      if (record && record.response !== null) {
        if (record.fingerprint !== fingerprint) {
          throw new ConflictException(
            'This Idempotency-Key was used with a different request.',
          )
        }
        const value: T = JSON.parse(record.response)
        await authorizeReplay?.(value, manager)
        return { value, created: false }
      }

      const value = await create(manager)
      await manager.query(
        `UPDATE admin_create_receipt SET fingerprint = ?, response = ?,
           expiresAt = UTC_TIMESTAMP(6) + INTERVAL 24 HOUR WHERE requestId = ?`,
        [fingerprint, JSON.stringify(value), requestId],
      )
      return { value, created: true }
    })
  }

  @Cron(CronExpression.EVERY_HOUR)
  async prune() {
    if (isPrimaryClusterNode()) {
      await this.db.query(
        'DELETE FROM admin_create_receipt WHERE expiresAt <= UTC_TIMESTAMP(6)',
      )
    }
  }
}
