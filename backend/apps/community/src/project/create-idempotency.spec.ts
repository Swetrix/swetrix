jest.mock('../common/integrations/clickhouse', () => ({
  clickhouse: { query: jest.fn(), command: jest.fn() },
}))
jest.mock('../common/constants', () => ({}))
jest.mock('../analytics/analytics.service', () => ({}))
jest.mock('../user/user.service', () => ({}))
jest.mock('../mailer/mailer.service', () => ({}))
jest.mock('./project.service', () => ({}))
jest.mock('../common/utils', () => ({
  deriveKey: () => 'ff'.repeat(32),
}))

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { getIdempotencyRequest } from '../common/idempotency'
import { clickhouse } from '../common/integrations/clickhouse'
import { createIdempotently } from './create-idempotency'
import { ProjectController } from './project.controller'

const target = { table: 'annotation' as const, projectId: 'a12345678901' }
const data = { id: 'reserved', text: 'launch', date: '2026-11-04' }
const request = getIdempotencyRequest('user', 'create_annotation', 'retry', {
  text: data.text,
})
const query = jest.mocked(clickhouse.query)
const command = jest.mocked(clickhouse.command)

function setup() {
  const receipts = new Map<
    string,
    {
      fingerprint: string
      response: string
      attempt: string
      completed: number
    }
  >()
  const resources = new Set<string>()
  command.mockImplementation(
    async ({ query, query_params, session_id, clickhouse_settings }) => {
      const { requestId, fingerprint, response, attempt } =
        query_params as Record<string, string>
      expect(clickhouse_settings.async_insert).toBe(0)
      if (query.includes('NOT EXISTS')) {
        expect(session_id).toBe(`swetrix-admin-create-${requestId}`)
        expect(clickhouse_settings.wait_end_of_query).toBe(1)
        expect(query).toContain('created > now() - INTERVAL 24 HOUR')
        if (!receipts.has(requestId))
          receipts.set(requestId, {
            fingerprint,
            response,
            attempt,
            completed: 0,
          })
      } else {
        const receipt = receipts.get(requestId)
        if (receipt?.attempt === attempt) receipt.completed = 1
      }
      return {} as any
    },
  )
  query.mockImplementation(async ({ query, query_params }) => {
    const row = query.includes('FROM admin_create_receipt')
      ? receipts.get(String(query_params.requestId))
      : resources.has(String(query_params.id)) && 1
    return {
      json: async () => ({ data: row ? [{ ...Object(row) }] : [] }),
    } as any
  })
  return { receipts, resources }
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.SECRET_KEY_BASE = 'idempotency-test'
})

it('replays the original body after modifications or deletion and rejects mismatched input', async () => {
  const { receipts, resources } = setup()
  const insert = jest.fn(async () => {
    resources.add(data.id)
  })
  await expect(
    createIdempotently(request, target, data, insert),
  ).resolves.toEqual(data)
  resources.clear()
  const retry = () =>
    createIdempotently(request, target, { ...data, id: 'new-id' }, insert)
  await expect(retry()).resolves.toEqual(data)
  expect(receipts.get(request.requestId).response).not.toContain(data.text)
  const changed = getIdempotencyRequest('user', 'create_annotation', 'retry', {
    text: 'changed',
  })
  await expect(
    createIdempotently(changed, target, data, insert),
  ).rejects.toThrow(/different request body/)
  expect(insert).toHaveBeenCalledTimes(1)
})

it('returns a conflict to an overlapping caller and never repeats an unresolved mutation', async () => {
  setup()
  let resolveStart: () => void
  let end: () => void
  const started = new Promise<void>((resolve) => {
    resolveStart = resolve
  })
  const wait = new Promise<void>((resolve) => {
    end = resolve
  })
  const insert = jest.fn(async () => {
    resolveStart()
    await wait
    throw new Error('connection interrupted')
  })
  const first = createIdempotently(request, target, data, insert)
  await started
  await expect(
    createIdempotently(request, target, data, insert),
  ).rejects.toBeInstanceOf(ConflictException)
  end()
  await expect(first).rejects.toThrow('connection interrupted')
  await expect(
    createIdempotently(request, target, data, insert),
  ).rejects.toBeInstanceOf(ConflictException)
  expect(insert).toHaveBeenCalledTimes(1)
})

it('recovers a write committed before the response was received using the reserved ID and project', async () => {
  const { resources } = setup()
  const insert = jest.fn(async () => {
    resources.add(data.id)
    throw new Error('ack lost')
  })
  await expect(
    createIdempotently(request, target, data, insert),
  ).rejects.toThrow('ack lost')
  const retry = { ...data, id: 'another-id' }
  await expect(
    createIdempotently(request, target, retry, insert),
  ).resolves.toEqual(data)
  expect(query).toHaveBeenCalledWith(
    expect.objectContaining({
      query: expect.stringContaining('projectId = {scope:String}'),
      query_params: { id: data.id, scope: target.projectId },
    }),
  )
  resources.clear()
  await expect(
    createIdempotently(request, target, retry, insert),
  ).resolves.toEqual(data)
  expect(insert).toHaveBeenCalledTimes(1)
})

it('withholds a completed project receipt after the caller loses ownership', async () => {
  setup()
  const project = { table: 'project' as const, userId: 'owner' }
  const req = getIdempotencyRequest('owner', 'create_project', 'retry', {
    name: 'Site',
  })
  const insert = jest.fn(async () => {})
  await createIdempotently(req, project, { id: 'a12345678901' }, insert)
  await expect(
    createIdempotently(req, project, { id: 'b12345678901' }, insert),
  ).rejects.toBeInstanceOf(NotFoundException)
  expect(query).toHaveBeenCalledWith(
    expect.objectContaining({
      query: expect.stringContaining('adminId = {scope:String}'),
      query_params: { id: 'a12345678901', scope: 'owner' },
    }),
  )
})

it('bypasses the receipt table entirely for requests without a key', async () => {
  setup()
  const insert = jest.fn(async () => {})
  await expect(
    createIdempotently(undefined, target, data, insert),
  ).resolves.toEqual(data)
  expect(insert).toHaveBeenCalledTimes(1)
  expect(query).not.toHaveBeenCalled()
  expect(command).not.toHaveBeenCalled()
})

it('checks current project management permissions before replaying an annotation or funnel', async () => {
  const service = {
    getFullProject: jest.fn(async () => ({ id: target.projectId })),
    allowedToManage: jest.fn(() => {
      throw new ForbiddenException()
    }),
  }
  const controller = new ProjectController(
    service as any,
    null,
    { log() {} } as any,
    null,
    null,
  )
  await expect(
    controller.createAnnotation(
      { pid: target.projectId, text: 'launch', date: '2026-11-04' },
      'former-admin',
      'key',
    ),
  ).rejects.toBeInstanceOf(ForbiddenException)
  await expect(
    controller.createFunnel(
      { pid: target.projectId, name: 'test', steps: ['/cart', '/checkout'] },
      'former-admin',
      'key',
    ),
  ).rejects.toBeInstanceOf(ForbiddenException)
  expect(service.allowedToManage).toHaveBeenCalledTimes(2)
  expect(query).not.toHaveBeenCalled()
  expect(command).not.toHaveBeenCalled()
})
