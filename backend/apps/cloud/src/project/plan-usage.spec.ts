jest.mock('../common/constants', () => ({
  redis: { del: jest.fn() },
  getRedisUserCountKey: (uid: string) => `count:${uid}`,
  getRedisUserUsageInfoKey: (uid: string) => `usage:${uid}`,
}))
jest.mock('../common/integrations/clickhouse', () => ({
  clickhouse: { query: jest.fn() },
}))
jest.mock('../user/user.service', () => ({ UserService: class {} }))
jest.mock('../mailer/mailer.service', () => ({ MailerService: class {} }))
jest.mock('../common/utils', () => ({}))

import dayjs from 'dayjs'
import { ProjectService } from './project.service'
import { clickhouse } from '../common/integrations/clickhouse'
import { redis } from '../common/constants'
import {
  DashboardBlockReason,
  PlanCode,
  User,
} from '../user/entities/user.entity'

describe('usage after traffic cleanup', () => {
  let service: ProjectService
  let user: User
  let userService: { findOne: jest.Mock; updatePlanUsageState: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    user = {
      id: 'owner',
      planCode: PlanCode['200k'],
      projects: [{ id: 'project00001' }, { id: 'project00002' }],
      planExceedContactedAt: new Date('2026-09-01T00:00:00Z'),
      dashboardBlockReason: DashboardBlockReason.exceeding_plan_limits,
    } as User
    userService = {
      findOne: jest.fn().mockResolvedValue(user),
      updatePlanUsageState: jest.fn().mockResolvedValue(true),
    }
    service = Object.assign(Object.create(ProjectService.prototype), {
      userService,
    })
    service.findOne = jest.fn().mockResolvedValue({ admin: { id: 'owner' } })
    service.clearProjectsRedisCache = jest.fn()
    jest.mocked(clickhouse.query).mockResolvedValue({
      json: async () => ({ data: [{ current: '210000', previous: '250000' }] }),
    } as never)
  })

  it('clears all cached totals and resolves an existing usage lock', async () => {
    await service.refreshUsageAfterDeletion('project00001')
    expect(redis.del).toHaveBeenCalledWith(
      'count:owner',
      'usage:owner',
      'usage:owner_last30d',
    )
    expect(userService.updatePlanUsageState).toHaveBeenCalledWith(user, {
      planExceedContactedAt: null,
      dashboardBlockReason: null,
    })
    expect(service.clearProjectsRedisCache).toHaveBeenCalledWith('owner')
  })

  it('clears a pending warning before the grace period ends', async () => {
    user.dashboardBlockReason = null
    await service.refreshUsageAfterDeletion('project00001')
    expect(userService.updatePlanUsageState).toHaveBeenCalledTimes(1)
  })

  it('preserves the warning if remaining traffic still exceeds either rule', async () => {
    jest.mocked(clickhouse.query).mockResolvedValue({
      json: async () => ({ data: [{ current: 230000, previous: 230000 }] }),
    } as never)
    await service.refreshUsageAfterDeletion('project00001')
    expect(userService.updatePlanUsageState).not.toHaveBeenCalled()
  })

  it('uses both UTC calendar months, all owned projects, and excludes imported events', async () => {
    await service.getPlanUsage(user, dayjs.utc('2026-09-25'))
    const query = jest.mocked(clickhouse.query).mock.calls[0][0]
    expect(query.query_params).toEqual({
      pids: ['project00001', 'project00002'],
      previousMonthStart: '2026-08-01 00:00:00',
      monthStart: '2026-09-01 00:00:00',
      nextMonthStart: '2026-10-01 00:00:00',
    })
    expect(query.query).toContain('importID IS NULL')
    expect(query.query).toContain("'pageview', 'custom_event', 'error'")
    expect(query.query).toContain("= 'pass'")
  })

  it('does not resolve usage restrictions when the usage query fails', async () => {
    jest
      .mocked(clickhouse.query)
      .mockRejectedValue(new Error('ClickHouse unavailable'))
    await expect(
      service.refreshUsageAfterDeletion('project00001'),
    ).rejects.toThrow('ClickHouse unavailable')
    expect(userService.updatePlanUsageState).not.toHaveBeenCalled()
  })
})
