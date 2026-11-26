jest.mock('../common/constants', () => ({ MAX_FUNNELS: 1 }))
jest.mock('../common/integrations/clickhouse', () => ({}))
jest.mock('../user/user.service', () => ({ UserService: class {} }))
jest.mock('../mailer/mailer.service', () => ({ MailerService: class {} }))
jest.mock('../common/utils', () => ({ getIPFromHeaders: () => null }))
jest.mock('./gsc.service', () => ({}))
jest.mock('../analytics/analytics.service', () => ({}))
jest.mock('../organisation/organisation.service', () => ({
  OrganisationService: class {},
}))
jest.mock('../pending-invitation/pending-invitation.service', () => ({
  PendingInvitationService: class {},
}))
jest.mock('../common/analytics', () => ({ trackCustom: jest.fn() }))

import { ForbiddenException } from '@nestjs/common'
import type { DataSource } from 'typeorm'
import { trackCustom } from '../common/analytics'
import { getIdempotencyRequest } from '../common/idempotency'
import { IdempotentCreateService } from './idempotent-create.service'
import { ProjectController } from './project.controller'

const headers = { 'idempotency-key': 'intent-123' }
const userId = 'owner'
const pid = 'project00001'

function setup() {
  const manager = { query: jest.fn() }
  const transaction = jest.fn((fn) => fn(manager))
  const projectService = {
    getFullProject: jest.fn().mockResolvedValue({ id: pid, funnels: ['full'] }),
    allowedToManage: jest.fn(),
    countByAdminId: jest.fn(),
    createFunnel: jest.fn(),
    createAnnotation: jest.fn(),
  }
  const controller: ProjectController = Object.assign(
    Object.create(ProjectController.prototype),
    {
      idempotentCreate: new IdempotentCreateService({
        transaction,
      } as unknown as DataSource),
      logger: { log: jest.fn() },
      userService: {
        findOne: jest.fn().mockResolvedValue({ id: userId, isActive: true }),
      },
      projectService,
    },
  )
  return { controller, projectService, transaction, query: manager.query }
}

beforeEach(() => jest.clearAllMocks())

it('replays a funnel at its limit only after current authorization, without a second analytics event', async () => {
  const { controller, projectService, transaction, query } = setup()
  const body = { pid, name: 'Buy', steps: ['/cart', '/checkout'] }
  const result = { ...body, id: 'funnel1' }
  const receipt = getIdempotencyRequest(
    userId,
    'create_funnel',
    headers['idempotency-key'],
    body,
  )
  query
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce([{ ...receipt, response: JSON.stringify(result) }])
  await expect(
    controller.createFunnel(body, userId, headers, ''),
  ).resolves.toEqual(result)
  expect(projectService.allowedToManage).toHaveBeenCalled()
  expect(projectService.createFunnel).not.toHaveBeenCalled()
  expect(trackCustom).not.toHaveBeenCalled()
  projectService.allowedToManage.mockImplementation(() => {
    throw new ForbiddenException()
  })
  await expect(
    controller.createFunnel(body, userId, headers, ''),
  ).rejects.toBeInstanceOf(ForbiddenException)
  expect(transaction).toHaveBeenCalledTimes(1)
})

it('will not replay a created project after it is transferred or deleted', async () => {
  const { controller, projectService, query } = setup()
  const body = { name: 'Site' }
  const receipt = getIdempotencyRequest(
    userId,
    'create_project',
    headers['idempotency-key'],
    body,
  )
  query
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce([
      {
        ...receipt,
        response: JSON.stringify({ id: pid, name: 'Site' }),
      },
    ])
    .mockResolvedValueOnce([])
  await expect(
    controller.create(body, headers, '', userId),
  ).rejects.toBeInstanceOf(ForbiddenException)
  expect(query).toHaveBeenLastCalledWith(
    expect.stringContaining('organisationId'),
    [pid, userId, null],
  )
  expect(projectService.countByAdminId).not.toHaveBeenCalled()
  expect(trackCustom).not.toHaveBeenCalled()
})

it('writes an annotation with the manager that records its response', async () => {
  const { controller, projectService, query } = setup()
  const body = { pid, date: '2026-01-01', text: 'Launch' }
  query
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce([{ response: null }])
    .mockResolvedValueOnce({})
  projectService.createAnnotation.mockResolvedValue({
    id: 'annotation1',
    text: 'Launch',
  })
  const result = await controller.createAnnotation(body, userId, headers, '')
  expect(projectService.createAnnotation).toHaveBeenCalledWith(pid, body, {
    query,
  })
  expect(JSON.parse(query.mock.calls[2][1][1])).toEqual(result)
  expect(trackCustom).toHaveBeenCalledTimes(1)
})
