import { BadRequestException } from '@nestjs/common'
import { createHash, createHmac } from 'crypto'

export type CreateOperation =
  | 'create_project'
  | 'create_funnel'
  | 'create_annotation'

export interface IdempotencyRequest {
  requestId: string
  fingerprint: string
}

export function getIdempotencyRequest(
  userId: string,
  operation: CreateOperation,
  key: string | undefined,
  payload: unknown,
): IdempotencyRequest | undefined {
  if (key === undefined) return undefined
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(key)) {
    throw new BadRequestException(
      'Idempotency-Key must contain 1–128 letters, numbers, periods, underscores, colons or hyphens.',
    )
  }
  const canonical = JSON.stringify(payload, (_, value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return value
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((field) => [field, value[field]]),
    )
  })
  return {
    requestId: createHash('sha256')
      .update(JSON.stringify([userId, operation, key]))
      .digest('hex'),
    fingerprint: createHmac('sha256', key).update(canonical).digest('hex'),
  }
}
