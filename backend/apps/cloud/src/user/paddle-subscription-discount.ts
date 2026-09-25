interface PaddleCredentials {
  vendorId: string
  apiKey: string
}

interface PaddleTransaction {
  checkout_id: string
  is_one_off: boolean
  subscription: { subscription_id: number }
}

interface PaddleCoupon {
  coupon: string
  is_recurring: boolean
  discount_type: 'percentage' | 'flat'
  discount_amount: number
  discount_currency: string
}

const TIMEOUT_MS = 10000

export async function getPaddleSubscriptionDiscount(
  subscriptionId: string,
  planId: number,
  currency: string,
  credentials: PaddleCredentials,
): Promise<{ recurring_price?: number }> {
  if (!/^\d+$/.test(subscriptionId)) {
    throw new Error('Invalid Paddle subscription ID')
  }

  async function post<T>(endpoint: string, params: Record<string, string>) {
    const response = await fetch(
      `https://vendors.paddle.com/api/2.0/${endpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          vendor_id: credentials.vendorId,
          vendor_auth_code: credentials.apiKey,
          ...params,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    )
    const data = await response.json()

    if (
      !response.ok ||
      data.success !== true ||
      !Array.isArray(data.response)
    ) {
      throw new Error('Unable to verify Paddle subscription discount')
    }

    return data.response as T[]
  }

  let checkoutId: string | undefined
  for (let page = 1; ; page++) {
    const transactions = await post<PaddleTransaction>(
      `subscription/${subscriptionId}/transactions`,
      { page: String(page), results_per_page: '100' },
    )
    checkoutId = transactions.find(
      (transaction) =>
        !transaction.is_one_off &&
        String(transaction.subscription?.subscription_id) === subscriptionId &&
        transaction.checkout_id,
    )?.checkout_id

    if (checkoutId || transactions.length < 100) break
  }

  if (!checkoutId) {
    throw new Error('Unable to find the Paddle subscription checkout')
  }

  const orderResponse = await fetch(
    `https://checkout.paddle.com/api/1.0/order?${new URLSearchParams({ checkout_id: checkoutId })}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  )
  const orderData = await orderResponse.json()
  const order = orderData.order

  if (
    !orderResponse.ok ||
    orderData.state !== 'processed' ||
    String(order?.subscription_id) !== subscriptionId
  ) {
    throw new Error('Unable to verify the Paddle subscription checkout')
  }

  if (!order.coupon_code) return {}

  const coupons = await post<PaddleCoupon>('product/list_coupons', {
    product_id: String(planId),
    coupon: order.coupon_code,
  })
  const coupon = coupons.find(
    (candidate) => candidate.coupon === order.coupon_code,
  )

  if (!coupon || !coupon.is_recurring) return {}
  if (
    coupon.discount_type === 'flat' &&
    coupon.discount_currency !== currency
  ) {
    return {}
  }

  const plans = await post<{
    id: number
    recurring_price: Record<string, string>
  }>('subscription/plans', { plan: String(planId) })
  const price = plans.find((plan) => Number(plan.id) === planId)
    ?.recurring_price[currency]
  const amount = Number(price)
  const discount = Number(coupon.discount_amount)

  if (
    price == null ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    (coupon.discount_type === 'percentage' && discount > 100) ||
    !['percentage', 'flat'].includes(coupon.discount_type)
  ) {
    throw new Error('Invalid Paddle subscription discount pricing')
  }

  const discountedAmount =
    coupon.discount_type === 'percentage'
      ? amount * (1 - discount / 100)
      : amount - discount

  return {
    recurring_price: Math.max(0, Math.round(discountedAmount * 100) / 100),
  }
}
