import { getPaddleSubscriptionDiscount } from './paddle-subscription-discount'

describe('Paddle subscription discounts', () => {
  const credentials = { vendorId: '1', apiKey: 'test-key' }
  let fetchMock: jest.SpyInstance

  const reply = (data: unknown, status = 200) =>
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(data), { status }),
    )

  const checkout = (couponCode = 'SAVE30', subscriptionId = 123) => {
    reply({
      success: true,
      response: [
        {
          checkout_id: 'checkout-123',
          is_one_off: false,
          subscription: { subscription_id: 123 },
        },
      ],
    })
    reply({
      state: 'processed',
      order: { subscription_id: subscriptionId, coupon_code: couponCode },
    })
  }

  const coupon = (overrides = {}) => {
    reply({
      success: true,
      response: [
        {
          coupon: 'SAVE30',
          is_recurring: true,
          discount_type: 'percentage',
          discount_amount: 30,
          discount_currency: 'USD',
          ...overrides,
        },
      ],
    })
  }

  const plan = (id = 456, price = '100.00') =>
    reply({
      success: true,
      response: [{ id, recurring_price: { USD: price } }],
    })

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch')
  })

  afterEach(() => jest.restoreAllMocks())

  it.each([
    [456, '100.00', 70],
    [789, '49.00', 34.3],
    [101, '199.99', 139.99],
  ])(
    'recalculates 30%% off destination plan %s',
    async (id, price, expected) => {
      checkout()
      coupon()
      plan(id, price)

      await expect(
        getPaddleSubscriptionDiscount('123', id, 'USD', credentials),
      ).resolves.toEqual({ recurring_price: expected })

      const couponRequest = fetchMock.mock.calls[2][1].body as URLSearchParams
      expect(couponRequest.get('product_id')).toBe(String(id))
      expect(couponRequest.get('coupon')).toBe('SAVE30')
      expect(couponRequest.has('is_valid')).toBe(false)
    },
  )

  it('retains a recurring discount after its checkout redemption limit or expiry', async () => {
    checkout()
    coupon({ allowed_uses: 1, times_used: 1, expires: '2020-01-01 00:00:00' })
    plan()

    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).resolves.toEqual({ recurring_price: 70 })
  })

  it('uses normal pricing without a coupon', async () => {
    checkout('')
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).resolves.toEqual({})
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not apply a coupon outside its product scope', async () => {
    checkout()
    reply({ success: true, response: [] })
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).resolves.toEqual({})
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does not turn a one-time coupon into a recurring discount', async () => {
    checkout()
    coupon({ is_recurring: false })
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).resolves.toEqual({})
  })

  it('preserves a flat discount in the matching currency', async () => {
    checkout()
    coupon({ discount_type: 'flat', discount_amount: 10 })
    plan(456, '29.00')
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).resolves.toEqual({ recurring_price: 19 })
  })

  it('does not apply a flat discount in a different currency', async () => {
    checkout()
    coupon({ discount_type: 'flat', discount_currency: 'EUR' })
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).resolves.toEqual({})
  })

  it('caps a discount at the price of the plan', async () => {
    checkout()
    coupon({ discount_type: 'flat', discount_amount: 100 })
    plan(456, '29.00')
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).resolves.toEqual({ recurring_price: 0 })
  })

  it('rejects checkout details belonging to a different subscription', async () => {
    checkout('SAVE30', 999)
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).rejects.toThrow('Unable to verify the Paddle subscription checkout')
  })

  it('fails instead of silently dropping discounts when Paddle fails', async () => {
    checkout()
    reply({ success: false }, 503)
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).rejects.toThrow('Unable to verify Paddle subscription discount')
  })

  it('rejects missing destination currency pricing', async () => {
    checkout()
    coupon()
    plan()
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'GBP', credentials),
    ).rejects.toThrow('Invalid Paddle subscription discount pricing')
  })

  it('skips one-off charges when finding the original subscription checkout', async () => {
    reply({
      success: true,
      response: Array.from({ length: 100 }, () => ({
        checkout_id: 'addon-checkout',
        is_one_off: true,
        subscription: { subscription_id: 123 },
      })),
    })
    checkout()
    coupon()
    plan()
    await expect(
      getPaddleSubscriptionDiscount('123', 456, 'USD', credentials),
    ).resolves.toEqual({ recurring_price: 70 })
    expect(fetchMock.mock.calls[1][1].body.get('page')).toBe('2')
  })
})
