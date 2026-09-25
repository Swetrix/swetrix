jest.mock('../common/constants', () => ({ redis: {} }))
jest.mock('../organisation/organisation.service', () => ({
  OrganisationService: class {},
}))

import { UserService } from './user.service'
import { DashboardBlockReason, PlanCode, User } from './entities/user.entity'

describe('guarded plan usage state changes', () => {
  it.each([
    DashboardBlockReason.payment_failed,
    DashboardBlockReason.subscription_cancelled,
    DashboardBlockReason.trial_ended,
  ])('never clears a %s restriction', async (reason) => {
    const update = jest.fn()
    const service: UserService = Object.assign(
      Object.create(UserService.prototype),
      {
        usersRepository: { update },
      },
    )
    expect(
      await service.updatePlanUsageState(
        { dashboardBlockReason: reason } as User,
        {
          dashboardBlockReason: null,
          planExceedContactedAt: null,
        },
      ),
    ).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('only updates the observed plan, warning and lock state', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 0 })
    const service: UserService = Object.assign(
      Object.create(UserService.prototype),
      {
        usersRepository: { update },
      },
    )
    const warnedAt = new Date('2026-09-01T00:00:00Z')
    expect(
      await service.updatePlanUsageState(
        {
          id: 'owner',
          planCode: PlanCode['200k'],
          planExceedContactedAt: warnedAt,
          dashboardBlockReason: DashboardBlockReason.exceeding_plan_limits,
        } as User,
        { dashboardBlockReason: null, planExceedContactedAt: null },
      ),
    ).toBe(false)
    expect(update.mock.calls[0][0]).toMatchObject({
      id: 'owner',
      planCode: '200k',
      planExceedContactedAt: expect.objectContaining({ _value: warnedAt }),
      dashboardBlockReason: DashboardBlockReason.exceeding_plan_limits,
      isAccountBillingSuspended: false,
    })
  })
})
