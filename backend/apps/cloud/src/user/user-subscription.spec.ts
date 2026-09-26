jest.mock('../common/constants', () => ({ redis: {} }))
jest.mock('../organisation/organisation.service', () => ({
  OrganisationService: class {},
}))
jest.mock('./paddle-subscription-discount')

import { UserService } from './user.service'
import { BillingFrequency, PlanCode, PlanType } from './entities/user.entity'
import { getPaddleSubscriptionDiscount } from './paddle-subscription-discount'

describe('subscription plan changes', () => {
  const discountMock = jest.mocked(getPaddleSubscriptionDiscount)
  let service: UserService
  let fetchMock: jest.SpyInstance

  beforeEach(() => {
    service = Object.create(UserService.prototype)
    service.findOne = jest.fn().mockResolvedValue({
      id: 'user-1',
      subID: '123',
      tierCurrency: 'USD',
      planCode: PlanCode['100k'],
      planType: PlanType.standard,
      billingFrequency: BillingFrequency.Monthly,
    })
    service.update = jest.fn()
    service.recordUserSubscription = jest.fn()
    service.refreshWebsiteAddonEntitlements = jest.fn()
    service.refreshSessionReplayAddonEntitlements = jest.fn()
    discountMock.mockResolvedValue({ recurring_price: 70 })
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            response: {
              subscription_id: '123',
              immediate_payment: { amount: 15, currency: 'USD' },
              next_payment: { amount: 70, currency: 'USD', date: '2026-10-01' },
            },
          }),
        ),
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it.each([
    [PlanType.standard, PlanType.plus, 925536],
    [PlanType.plus, PlanType.standard, 916455],
    [PlanType.standard, PlanType.standard, 854654],
    [PlanType.standard, PlanType.plus, 925537],
  ])(
    'preserves preview/update pricing from %s to %s (%s)',
    async (from, to, planId) => {
      jest.mocked(service.findOne).mockResolvedValue({
        id: 'user-1',
        subID: '123',
        tierCurrency: 'USD',
        planCode: PlanCode['100k'],
        planType: from,
        billingFrequency: BillingFrequency.Monthly,
      } as Awaited<ReturnType<UserService['findOne']>>)
      const preview = await service.previewSubscription('user-1', planId, to)
      await service.updateSubscription('user-1', planId, to)

      expect(preview.nextPayment.amount).toBe(70)
      expect(discountMock).toHaveBeenCalledTimes(2)
      expect(discountMock).toHaveBeenCalledWith(
        '123',
        planId,
        'USD',
        expect.any(Object),
      )
      for (const [, request] of fetchMock.mock.calls) {
        expect(JSON.parse(request.body)).toMatchObject({
          subscription_id: 123,
          plan_id: planId,
          recurring_price: 70,
          keep_modifiers: true,
          prorate: true,
          bill_immediately: true,
        })
      }
    },
  )

  it('does not update Paddle or local entitlements if discount verification fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    discountMock.mockRejectedValue(new Error('Paddle unavailable'))

    await expect(
      service.updateSubscription('user-1', 925536, 'plus'),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(service.update).not.toHaveBeenCalled()
  })
})
