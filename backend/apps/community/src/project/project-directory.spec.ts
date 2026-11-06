import { clickhouse } from '../common/integrations/clickhouse'
import type { ApiKeyPrincipal } from '../api-key/api-key.types'
import { API_KEY_ACCESS } from '../api-key/api-key.types'
import { getProjectDirectory } from './project-directory'
import { ProjectController } from './project.controller'

jest.mock('../common/constants', () => ({}))
jest.mock('../common/utils', () => ({}))
jest.mock('../analytics/analytics.service', () => ({}))
jest.mock('../user/user.service', () => ({}))
jest.mock('../mailer/mailer.service', () => ({}))
jest.mock('./project.service', () => ({}))
jest.mock('../common/integrations/clickhouse', () => ({
  clickhouse: { query: jest.fn() },
}))

const owner = 'owner'
const project = {
  id: 'abcdefghijkl',
  name: 'Swetrix',
  active: true,
  public: false,
  websiteUrl: null,
}
const pagination = { take: 25, skip: 0 }
const key: ApiKeyPrincipal = {
  id: 'test',
  scopes: ['projects:read'],
  projectIds: [project.id],
  allProjects: false,
  unrestricted: false,
}
const query = jest.mocked(clickhouse.query)
function respond(data: unknown[]) {
  query.mockResolvedValueOnce({ json: async () => ({ data }) } as Awaited<
    ReturnType<typeof clickhouse.query>
  >)
}

beforeEach(() => query.mockReset())

it('exposes directory with just projects:read and passes the authenticated key and bounded defaults', async () => {
  const controller = new ProjectController(null, null, null, null, null)
  expect(
    Reflect.getMetadata(API_KEY_ACCESS, controller.projectDirectory),
  ).toMatchObject({
    scope: 'projects:read',
    source: 'projectDirectory',
    requires: [],
  })
  expect(
    Reflect.getMetadata(API_KEY_ACCESS, controller.get).requires,
  ).toContain('funnels:read')
  const request = { user: { apiKeyAccess: key } }
  expect(() => controller.projectDirectory(request, owner, 101)).toThrow()
  respond([])
  respond([{ total: 0 }])
  await controller.projectDirectory(request, owner)
  expect(query.mock.calls[0][0].query_params).toEqual({
    userId: owner,
    allowed: key.projectIds,
    take: 25,
    skip: 0,
  })
})

it('restricts scoped discovery and its total to currently owned, permitted projects', async () => {
  respond([project])
  respond([{ total: 1 }])
  const result = await getProjectDirectory(
    owner,
    { ...pagination, search: '%_', id: project.id },
    key,
  )
  expect(result).toEqual({ results: [project], total: 1, page_total: 1 })
  for (const [request] of query.mock.calls) {
    expect(request.query).toContain(
      'adminId = {userId:String} AND id IN {allowed:Array(String)}',
    )
    expect(request.query).toContain('id = {id:FixedString(12)}')
    expect(request.query).toContain(
      'positionCaseInsensitiveUTF8(name, {search:String})',
    )
    expect(request.query).not.toContain('project_share')
    expect(request.query_params).toMatchObject({
      userId: owner,
      allowed: key.projectIds,
      search: '%_',
      id: project.id,
    })
  }
  expect(query.mock.calls[0][0].query).toContain(
    'ORDER BY name, id LIMIT {take:UInt32} OFFSET {skip:UInt32}',
  )
})

it('keeps an empty allowlist empty and all-project keys limited to the owner', async () => {
  expect(
    await getProjectDirectory(owner, pagination, { ...key, projectIds: [] }),
  ).toEqual({ results: [], total: 0, page_total: 0 })
  expect(query).not.toHaveBeenCalled()
  respond([])
  respond([{ total: 3 }])
  expect(
    await getProjectDirectory(
      owner,
      { take: 10, skip: 5 },
      { ...key, allProjects: true },
    ),
  ).toEqual({ results: [], total: 3, page_total: 0 })
  for (const [request] of query.mock.calls) {
    expect(request.query).toContain('WHERE adminId = {userId:String}')
    expect(request.query).not.toMatch(/allowed|project_share/)
  }
})

it.each([undefined, { ...key, unrestricted: true }])(
  'includes owned projects and confirmed shares for account access',
  async (principal) => {
    respond([])
    respond([{ total: 0 }])
    await getProjectDirectory(owner, pagination, principal)
    for (const [request] of query.mock.calls) {
      expect(request.query).toContain('adminId = {userId:String} OR id IN')
      expect(request.query).toContain(
        'FROM project_share WHERE userId = {userId:String} AND confirmed = 1',
      )
      expect(request.query).not.toMatch(/password|Secret|funnels|FROM events/)
    }
  },
)
