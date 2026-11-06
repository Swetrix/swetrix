jest.mock('../common/utils', () => ({ isPrimaryClusterNode: () => true }))

import { ConflictException } from '@nestjs/common'
import type { DataSource } from 'typeorm'
import { getIdempotencyRequest } from '../common/idempotency'
import { IdempotentCreateService } from './idempotent-create.service'

const request = getIdempotencyRequest(
  'owner',
  'create_annotation',
  'report-1',
  { text: 'Launch' },
)
const value = { id: 'abc', text: 'Launch' }

function setup(record = { fingerprint: request.fingerprint, response: null }) {
  const manager = {
    query: jest
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(record ? [record] : [])
      .mockResolvedValueOnce({}),
  }
  const db = { transaction: jest.fn((fn) => fn(manager)) }
  const service = new IdempotentCreateService(db as unknown as DataSource)
  const create = jest.fn().mockResolvedValue(value)
  return { service, db, manager, create }
}

it('leaves unkeyed creates on the original database path', async () => {
  const { service, db, create } = setup()
  await expect(service.run(undefined, create)).resolves.toEqual({
    value,
    created: true,
  })
  expect(db.transaction).not.toHaveBeenCalled()
  expect(create).toHaveBeenCalledWith()
})

it('creates within the receipt transaction and records only the serialized response', async () => {
  const { service, db, manager, create } = setup()
  await expect(service.run(request, create)).resolves.toEqual({
    value,
    created: true,
  })
  expect(db.transaction).toHaveBeenCalledTimes(1)
  expect(create).toHaveBeenCalledWith(manager)
  expect(manager.query).toHaveBeenLastCalledWith(
    expect.stringContaining('UPDATE admin_create_receipt'),
    [request.fingerprint, JSON.stringify(value), request.requestId],
  )
})

it('rechecks access before replay, never invoking the mutation or extending the retention window', async () => {
  const { service, manager, create } = setup({
    fingerprint: request.fingerprint,
    response: JSON.stringify(value),
  })
  const authorize = jest.fn().mockResolvedValue(undefined)
  await expect(service.run(request, create, authorize)).resolves.toEqual({
    value,
    created: false,
  })
  expect(authorize).toHaveBeenCalledWith(value, manager)
  expect(create).not.toHaveBeenCalled()
  expect(manager.query).toHaveBeenCalledTimes(2)
})

it('rejects changed payloads and permits fresh uses after expiry', async () => {
  const record = {
    fingerprint: 'other-body',
    response: JSON.stringify(value),
  }
  const active = setup(record)
  await expect(
    active.service.run(request, active.create),
  ).rejects.toBeInstanceOf(ConflictException)
  expect(active.create).not.toHaveBeenCalled()
  const expired = setup(null)
  await expect(expired.service.run(request, expired.create)).resolves.toEqual({
    value,
    created: true,
  })
})
