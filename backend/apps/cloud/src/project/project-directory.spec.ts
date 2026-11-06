jest.mock('../common/constants', () => ({
  isValidPID: (id: string) => /^(?!.*--)[a-zA-Z0-9-]{12}$/.test(id),
}))
jest.mock('../common/integrations/clickhouse', () => ({}))
jest.mock('../user/user.service', () => ({ UserService: class {} }))
jest.mock('../mailer/mailer.service', () => ({ MailerService: class {} }))
jest.mock('../common/utils', () => ({}))
jest.mock('./gsc.service', () => ({}))
jest.mock('../analytics/analytics.service', () => ({}))
jest.mock('../organisation/organisation.service', () => ({
  OrganisationService: class {},
}))
jest.mock('../pending-invitation/pending-invitation.service', () => ({
  PendingInvitationService: class {},
}))

import { BadRequestException, RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { API_KEY_ACCESS } from '../api-key/api-key.types'
import type { ApiKeyPrincipal } from '../api-key/api-key.types'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

const key: ApiKeyPrincipal = {
  id: 'key',
  scopes: ['projects:read'],
  allProjects: false,
  unrestricted: false,
  projectIds: ['project00001'],
}
const page = { take: 25, skip: 0 }

it('registers a dedicated GET with projects:read, forwarding its trusted credential and bounded query', () => {
  const getProjectDirectory = jest.fn()
  const controller: ProjectController = Object.assign(
    Object.create(ProjectController.prototype),
    {
      projectService: { getProjectDirectory },
    },
  )
  const request = { user: { apiKeyAccess: key } }
  const handler = ProjectController.prototype.projectDirectory
  expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/directory')
  expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET)
  expect(Reflect.getMetadata(API_KEY_ACCESS, handler)).toEqual({
    scope: 'projects:read',
    source: 'projectDirectory',
    field: 'pid',
    requires: [],
  })
  controller.projectDirectory(request, 'owner')
  expect(getProjectDirectory).toHaveBeenCalledWith(
    'owner',
    { ...page, search: undefined, id: undefined },
    key,
  )
  controller.projectDirectory(
    request,
    'owner',
    2,
    4,
    '  my site  ',
    key.projectIds[0],
  )
  expect(getProjectDirectory).toHaveBeenLastCalledWith(
    'owner',
    { take: 2, skip: 4, search: 'my site', id: key.projectIds[0] },
    key,
  )
  for (const [take, skip] of [
    [0, 0],
    [101, 0],
    [25, -1],
    [25, 50_001],
  ]) {
    expect(() =>
      controller.projectDirectory(request, 'owner', take, skip),
    ).toThrow(BadRequestException)
  }
  expect(() =>
    controller.projectDirectory(request, 'owner', 1, 0, 'x'.repeat(101)),
  ).toThrow(BadRequestException)
  expect(() =>
    controller.projectDirectory(request, 'owner', 1, 0, '', 'incorrect'),
  ).toThrow(BadRequestException)
  expect(getProjectDirectory).toHaveBeenCalledTimes(2)
})

function setup() {
  const row = {
    id: 'project00001',
    name: 'My site',
    websiteUrl: null,
    active: true,
    public: false,
  }
  const query = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[row], 7]),
  }
  const service: ProjectService = Object.assign(
    Object.create(ProjectService.prototype),
    {
      projectsRepository: { createQueryBuilder: () => query },
    },
  )
  return { query, service, row }
}

it('scopes results and totals to currently owned, selected projects and reads only directory fields', async () => {
  const { query, service, row } = setup()
  await expect(
    service.getProjectDirectory(
      'owner',
      { take: 2, skip: 3, search: '%_', id: row.id },
      key,
    ),
  ).resolves.toEqual({ results: [row], page_total: 1, total: 7 })
  expect(query.select).toHaveBeenCalledWith([
    'project.id',
    'project.name',
    'project.websiteUrl',
    'project.active',
    'project.public',
  ])
  expect(query.where).toHaveBeenCalledWith('project.adminId = :userId', {
    userId: 'owner',
  })
  expect(query.andWhere).toHaveBeenCalledWith(
    expect.stringContaining('IN (:...projectIds)'),
    { projectIds: key.projectIds },
  )
  expect(query.andWhere).toHaveBeenCalledWith(expect.stringContaining(':id'), {
    id: row.id,
  })
  expect(query.andWhere).toHaveBeenCalledWith(
    expect.stringContaining('INSTR('),
    { search: '%_' },
  )
  expect(query.skip).toHaveBeenCalledWith(3)
  expect(query.take).toHaveBeenCalledWith(2)
  expect(query.addOrderBy).toHaveBeenCalledWith('project.id', 'ASC')
})

it('keeps all-project scoped keys owner-only and returns an empty page for an empty selection', async () => {
  const { query, service } = setup()
  await expect(
    service.getProjectDirectory('owner', page, { ...key, projectIds: [] }),
  ).resolves.toEqual({ results: [], page_total: 0, total: 0 })
  expect(query.getManyAndCount).not.toHaveBeenCalled()
  await service.getProjectDirectory('owner', page, {
    ...key,
    allProjects: true,
  })
  expect(query.where).toHaveBeenLastCalledWith('project.adminId = :userId', {
    userId: 'owner',
  })
  expect(query.andWhere).not.toHaveBeenCalled()
})

it.each([undefined, { ...key, unrestricted: true }])(
  'includes accepted shares and organisation memberships for user-level credentials',
  async (credential) => {
    const { query, service } = setup()
    await service.getProjectDirectory('member', page, credential)
    const [predicate, parameters] = query.where.mock.calls[0]
    expect(parameters).toEqual({ userId: 'member' })
    expect(predicate).toContain('ps.userId = :userId AND ps.confirmed = true')
    expect(predicate).toContain('om.userId = :userId AND om.confirmed = true')
    expect(predicate).not.toContain('project.public')
  },
)
