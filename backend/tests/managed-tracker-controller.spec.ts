import { NotFoundException } from '@nestjs/common'
import { ProjectController as CloudController } from '../apps/cloud/src/project/project.controller'
import { ProjectController as CommunityController } from '../apps/community/src/project/project.controller'
import { ProjectService as CloudProjects } from '../apps/cloud/src/project/project.service'
import { clickhouse } from '../apps/community/src/common/integrations/clickhouse'
import { SessionReplayS3Service as CloudStorage } from '../apps/cloud/src/analytics/session-replay-s3.service'
import { SessionReplayS3Service as CommunityStorage } from '../apps/community/src/analytics/session-replay-s3.service'
import { PlanCode, PlanType } from '../apps/cloud/src/user/entities/user.entity'

jest.mock('../apps/cloud/src/analytics/analytics.service', () => ({}))
jest.mock('../apps/community/src/analytics/analytics.service', () => ({}))
jest.mock('../apps/cloud/src/project/gsc.service', () => ({}))
jest.mock('../apps/cloud/src/user/user.service', () => ({}))
jest.mock('../apps/community/src/user/user.service', () => ({}))
jest.mock('../apps/cloud/src/mailer/mailer.service', () => ({}))
jest.mock('../apps/community/src/mailer/mailer.service', () => ({}))
jest.mock('../apps/cloud/src/organisation/organisation.service', () => ({}))
jest.mock(
  '../apps/cloud/src/pending-invitation/pending-invitation.service',
  () => ({}),
)
jest.mock('../apps/cloud/src/common/integrations/clickhouse', () => ({}))
jest.mock('../apps/community/src/common/integrations/clickhouse', () => ({
  clickhouse: { query: jest.fn() },
}))
jest.mock(
  'ioredis',
  () =>
    class {
      on() {}
    },
)

const pid = 'test12345abc'
const requested = {
  pageviews: false,
  outboundLinks: true,
  errors: false,
  sessionReplay: true,
}

describe('public tracker config', () => {
  const projects = Object.assign(Object.create(CloudProjects.prototype), {
    findOne: jest.fn(),
  })
  const replayStorage = { isConfigured: jest.fn(() => true) }
  const cloud = Object.assign(Object.create(CloudController.prototype), {
    projectService: projects,
    replayStorage,
  }) as CloudController
  const community = Object.assign(
    Object.create(CommunityController.prototype),
    { replayStorage },
  ) as CommunityController
  const query = jest.mocked(clickhouse.query)

  beforeEach(() => jest.clearAllMocks())

  it.each(['short', 'abcdefghijkl\n', 'abcd--efghij', 'bad/path!123'])(
    'rejects invalid PID %j before touching storage',
    async (id) => {
      await expect(cloud.getTrackerConfig(id)).rejects.toThrow(
        NotFoundException,
      )
      await expect(community.getTrackerConfig(id)).rejects.toThrow(
        NotFoundException,
      )
      expect(projects.findOne).not.toHaveBeenCalled()
      expect(query).not.toHaveBeenCalled()
    },
  )

  it('queries only active, unarchived Cloud projects and returns 404 for a miss', async () => {
    projects.findOne.mockResolvedValue(null)
    await expect(cloud.getTrackerConfig(pid)).rejects.toThrow(NotFoundException)
    expect(projects.findOne).toHaveBeenCalledWith({
      where: { id: pid, active: true, isArchived: false },
      select: {
        id: true,
        trackingSettings: true,
        admin: { id: true, planType: true, planCode: true },
      },
      relations: { admin: true },
    })
  })

  it.each([
    [PlanType.plus, true],
    [PlanType.standard, false],
  ])(
    'applies the current Cloud owner plan %s without exposing it',
    async (planType, sessionReplay) => {
      projects.findOne.mockResolvedValue({
        admin: { planCode: PlanCode['50k'], planType },
        trackingSettings: requested,
      })
      await expect(cloud.getTrackerConfig(pid)).resolves.toEqual({
        ...requested,
        sessionReplay,
      })
    },
  )

  it('ignores inactive CE projects and selects only their script settings', async () => {
    query.mockResolvedValue({ json: async () => ({ data: [] }) } as never)
    await expect(community.getTrackerConfig(pid)).rejects.toThrow(
      NotFoundException,
    )
    expect(query).toHaveBeenCalledWith({
      query: expect.stringContaining(
        'SELECT trackingSettings FROM project WHERE id = {id:FixedString(12)} AND active = 1',
      ),
      query_params: { id: pid },
    })
  })

  it('keeps recording disabled for CE with unavailable storage', async () => {
    replayStorage.isConfigured.mockReturnValueOnce(false)
    query.mockResolvedValue({
      json: async () => ({
        data: [{ trackingSettings: JSON.stringify(requested) }],
      }),
    } as never)
    await expect(community.getTrackerConfig(pid)).resolves.toEqual({
      ...requested,
      sessionReplay: false,
    })
  })
})

describe.each([CloudStorage, CommunityStorage])(
  'session replay storage',
  (Storage) => {
    it('rejects malformed configured endpoints before recording', () => {
      const env = jest.replaceProperty(process, 'env', {
        ...process.env,
        SESSION_REPLAY_S3_ENDPOINT: 'https://host with spaces',
        SESSION_REPLAY_S3_ACCESS_KEY_ID: 'key',
        SESSION_REPLAY_S3_SECRET_ACCESS_KEY: 'secret',
        SESSION_REPLAY_S3_BUCKET: 'bucket',
        SESSION_REPLAY_S3_REGION: '',
      })
      try {
        expect(new Storage().isConfigured()).toBe(false)
      } finally {
        env.restore()
      }
    })
  },
)
