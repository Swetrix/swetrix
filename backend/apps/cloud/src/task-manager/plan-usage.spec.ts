jest.mock('../alert/alert.service', () => ({}))
jest.mock('../integrations/telegram/telegram.service', () => ({}))
jest.mock('../user/user.service', () => ({}))
jest.mock('../project/project.service', () => ({}))
jest.mock('../action-tokens/action-tokens.service', () => ({}))
jest.mock('../analytics/analytics.service', () => ({}))
jest.mock('../analytics/salt.service', () => ({}))
jest.mock('../goal/goal.service', () => ({}))
jest.mock('../logger/logger.service', () => ({}))
jest.mock('../integrations/discord/discord.service', () => ({}))
jest.mock('../integrations/slack/slack.service', () => ({}))
jest.mock('../revenue/revenue.service', () => ({}))
jest.mock('../revenue/adapters/paddle.adapter', () => ({}))
jest.mock('../revenue/adapters/stripe.adapter', () => ({}))
jest.mock('../project/proxy-domain.service', () => ({}))
jest.mock(
  '../notification-channel/dispatchers/channel-dispatcher.service',
  () => ({}),
)
jest.mock('../notification-channel/template-renderer.service', () => ({}))
jest.mock('../mailer/mailer.service', () => ({}))
jest.mock('../common/utils', () => ({}))
jest.mock('../common/constants', () => ({}))
jest.mock('../common/integrations/clickhouse', () => ({}))

import { TaskManagerService } from './task-manager.service'
import { DashboardBlockReason, PlanCode } from '../user/entities/user.entity'
import { evaluatePlanUsage } from '../user/plan-usage'

const createService = (warnedAt = '2026-09-11T12:00:00Z') => {
  const user = {
    id: 'owner',
    email: 'owner@example.com',
    planCode: PlanCode['200k'],
    planExceedContactedAt: new Date(warnedAt),
    dashboardBlockReason: null,
  }
  const dependencies = {
    userService: {
      getUsersForLockDashboards: jest.fn().mockResolvedValue([user]),
      getUsersForPlanUsageCheck: jest.fn().mockResolvedValue([user]),
      updatePlanUsageState: jest.fn().mockResolvedValue(true),
    },
    projectService: {
      getPlanUsage: jest
        .fn()
        .mockResolvedValue(evaluatePlanUsage(200000, 270000, 270000)),
      clearResolvedPlanUsage: jest.fn(),
      clearProjectsRedisCache: jest.fn(),
    },
    mailerService: { sendEmail: jest.fn() },
    logger: { error: jest.fn() },
  }
  const service: TaskManagerService = Object.assign(
    Object.create(TaskManagerService.prototype),
    dependencies,
  )
  return { service, user, ...dependencies }
}

describe('plan usage enforcement', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-25T12:00:00Z'))
  })
  afterEach(() => jest.useRealTimers())

  it('sends one notice when both overage rules match', async () => {
    const { service, mailerService, userService } = createService()
    await service.checkPlanUsage()
    expect(mailerService.sendEmail).toHaveBeenCalledTimes(1)
    expect(mailerService.sendEmail.mock.calls[0][2]).toMatchObject({
      hitPercentageLimit: true,
      upgradePeriodDays: 14,
      repeatedPercentageLimit: 10,
    })
    expect(userService.updatePlanUsageState).toHaveBeenCalledTimes(1)
  })

  it('does not record a warning when sending fails', async () => {
    const { service, mailerService, userService } = createService()
    mailerService.sendEmail.mockRejectedValue(new Error('mail unavailable'))
    await service.checkPlanUsage()
    expect(userService.updatePlanUsageState).not.toHaveBeenCalled()
  })

  it('clears a resolved warning instead of locking', async () => {
    const { service, user, projectService, userService, mailerService } =
      createService()
    projectService.getPlanUsage.mockResolvedValue(
      evaluatePlanUsage(200000, 200000, 270000),
    )
    await service.lockDashboards()
    expect(projectService.clearResolvedPlanUsage).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ exceedsLimit: false }),
    )
    expect(userService.updatePlanUsageState).not.toHaveBeenCalled()
    expect(mailerService.sendEmail).not.toHaveBeenCalled()
  })

  it('grants a full 14 days, including previously sent warnings', async () => {
    const { service, userService } = createService('2026-09-11T12:00:01Z')
    await service.lockDashboards()
    expect(userService.updatePlanUsageState).not.toHaveBeenCalled()
  })

  it('locks only after grace when fresh usage still exceeds the rules', async () => {
    const { service, user, userService, projectService, mailerService } =
      createService()
    await service.lockDashboards()
    expect(projectService.getPlanUsage).toHaveBeenCalledTimes(1)
    expect(userService.updatePlanUsageState).toHaveBeenCalledWith(user, {
      dashboardBlockReason: DashboardBlockReason.exceeding_plan_limits,
    })
    expect(projectService.clearProjectsRedisCache).toHaveBeenCalledWith('owner')
    expect(mailerService.sendEmail).toHaveBeenCalledTimes(1)
  })

  it('does not lock or email when the account state changed concurrently', async () => {
    const { service, userService, mailerService } = createService()
    userService.updatePlanUsageState.mockResolvedValue(false)
    await service.lockDashboards()
    expect(mailerService.sendEmail).not.toHaveBeenCalled()
  })

  it('does not lock when fresh usage cannot be read', async () => {
    const { service, projectService, userService, mailerService } =
      createService()
    projectService.getPlanUsage.mockRejectedValue(
      new Error('usage unavailable'),
    )
    await service.lockDashboards()
    expect(userService.updatePlanUsageState).not.toHaveBeenCalled()
    expect(mailerService.sendEmail).not.toHaveBeenCalled()
  })

  it('reviews an existing usage lock for recovery without resending the lock email', async () => {
    const { service, user, projectService, mailerService } = createService()
    user.dashboardBlockReason = DashboardBlockReason.exceeding_plan_limits
    await service.lockDashboards()
    expect(mailerService.sendEmail).not.toHaveBeenCalled()
    projectService.getPlanUsage.mockResolvedValue(
      evaluatePlanUsage(200000, 0, 270000),
    )
    await service.lockDashboards()
    expect(projectService.clearResolvedPlanUsage).toHaveBeenCalledTimes(1)
  })
})
