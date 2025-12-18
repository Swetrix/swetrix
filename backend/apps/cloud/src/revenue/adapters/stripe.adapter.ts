import { Injectable } from '@nestjs/common'
import { AppLoggerService } from '../../logger/logger.service'
import { RevenueService } from '../revenue.service'
import {
  RevenueProvider,
  RevenueStatus,
  RevenueTransaction,
  RevenueType,
} from '../interfaces/revenue.interface'

interface StripeListResponse<T> {
  object: 'list'
  data: T[]
  has_more: boolean
}

interface StripePaymentIntent {
  id: string
  object: 'payment_intent'
  status: string
  amount: number
  amount_received: number
  currency: string
  created: number
  customer?: { id: string; email?: string | null } | string | null
  invoice?:
    | {
        id: string
        subscription?: string | null
        lines?: { data?: { description?: string | null }[] }
      }
    | string
    | null
  latest_charge?:
    | {
        id: string
        metadata?: Record<string, string>
      }
    | string
    | null
  metadata?: Record<string, string>
  description?: string | null
}

interface StripeRefund {
  id: string
  object: 'refund'
  status: string
  amount: number
  currency: string
  created: number
  payment_intent?: StripePaymentIntent | string | null
  charge?: { id: string } | string | null
  metadata?: Record<string, string>
}

@Injectable()
export class StripeAdapter {
  private readonly baseUrl = 'https://api.stripe.com/v1'

  constructor(
    private readonly logger: AppLoggerService,
    private readonly revenueService: RevenueService,
  ) {}

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/account`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      return res.ok
    } catch (error) {
      this.logger.error({ error }, 'Failed to validate Stripe API key')
      return false
    }
  }

  async syncTransactions(
    projectId: string,
    apiKey: string,
    currency: string,
    lastSyncAt?: Date,
  ): Promise<number> {
    let syncedCount = 0

    // Small overlap window to avoid missing edge updates
    const effectiveLastSyncAt =
      lastSyncAt instanceof Date && !isNaN(lastSyncAt.getTime())
        ? new Date(lastSyncAt.getTime() - 60 * 1000)
        : undefined

    const createdGte = effectiveLastSyncAt
      ? Math.floor(effectiveLastSyncAt.getTime() / 1000)
      : undefined

    // Payment intents (sales/subscriptions)
    const intents = await this.fetchAll<StripePaymentIntent>(
      apiKey,
      '/payment_intents',
      {
        ...(createdGte ? { 'created[gte]': String(createdGte) } : {}),
        limit: '100',
        // Expansions for metadata + basic attribution
        'expand[]': [
          'data.customer',
          'data.invoice',
          'data.latest_charge',
        ] as any,
      },
    )

    for (const intent of intents) {
      if (intent.status !== 'succeeded') {
        continue
      }

      await this.processPaymentIntent(projectId, intent, currency)
      syncedCount++
    }

    // Refunds
    const refunds = await this.fetchAll<StripeRefund>(apiKey, '/refunds', {
      ...(createdGte ? { 'created[gte]': String(createdGte) } : {}),
      limit: '100',
      'expand[]': ['data.payment_intent'] as any,
    })

    for (const refund of refunds) {
      if (refund.status !== 'succeeded' && refund.status !== 'pending') {
        // keep only meaningful states
        continue
      }

      await this.processRefund(projectId, refund, currency)
      syncedCount++
    }

    this.logger.log({ projectId, syncedCount }, 'Stripe sync completed')
    return syncedCount
  }

  private async fetchAll<T>(
    apiKey: string,
    path: string,
    params: Record<string, string | string[]>,
  ): Promise<T[]> {
    const results: T[] = []
    let startingAfter: string | undefined
    let hasMore = true

    // Stripe list pagination uses `starting_after`
    while (hasMore) {
      const url = new URL(`${this.baseUrl}${path}`)

      for (const [k, v] of Object.entries(params)) {
        if (Array.isArray(v)) {
          for (const item of v) {
            url.searchParams.append(k, item)
          }
        } else {
          url.searchParams.set(k, v)
        }
      }

      if (startingAfter) {
        url.searchParams.set('starting_after', startingAfter)
      }

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        this.logger.error(
          { status: res.status, error: text, path },
          'Stripe API error',
        )
        throw new Error(`Stripe API error: ${res.status}`)
      }

      const data: StripeListResponse<T> = await res.json()
      results.push(...data.data)

      if (!data.has_more || data.data.length === 0) {
        hasMore = false
        continue
      }

      startingAfter = (data.data[data.data.length - 1] as any).id
    }

    return results
  }

  private async processPaymentIntent(
    projectId: string,
    intent: StripePaymentIntent,
    targetCurrency: string,
  ): Promise<void> {
    const originalAmount =
      (typeof intent.amount_received === 'number'
        ? intent.amount_received
        : intent.amount) / 100
    const originalCurrency = (intent.currency || '').toUpperCase()

    const amount = this.convertCurrency(
      originalAmount,
      originalCurrency,
      targetCurrency,
    )

    const invoice =
      intent.invoice && typeof intent.invoice !== 'string'
        ? intent.invoice
        : null

    const type = invoice?.subscription
      ? RevenueType.SUBSCRIPTION
      : RevenueType.SALE

    const metadata = intent.metadata || {}
    const chargeMeta =
      intent.latest_charge && typeof intent.latest_charge !== 'string'
        ? intent.latest_charge.metadata || {}
        : {}

    const profileId =
      metadata.swetrix_profile_id || chargeMeta.swetrix_profile_id || null
    const sessionId =
      metadata.swetrix_session_id || chargeMeta.swetrix_session_id || null

    const customer =
      intent.customer && typeof intent.customer !== 'string'
        ? intent.customer
        : null

    const productName =
      invoice?.lines?.data?.[0]?.description || intent.description || null

    const revenueTransaction: RevenueTransaction = {
      pid: projectId,
      transactionId: intent.id,
      provider: RevenueProvider.STRIPE,
      type,
      status: RevenueStatus.COMPLETED,
      amount,
      originalAmount,
      originalCurrency,
      currency: targetCurrency,
      profileId,
      sessionId,
      customerEmail: customer?.email || null,
      productId: null,
      productName,
      metadata,
      created: new Date(intent.created * 1000),
      syncedAt: new Date(),
    }

    await this.revenueService.insertTransaction(revenueTransaction)
  }

  private async processRefund(
    projectId: string,
    refund: StripeRefund,
    targetCurrency: string,
  ): Promise<void> {
    const originalAmount = refund.amount / 100
    const originalCurrency = (refund.currency || '').toUpperCase()

    const amount = this.convertCurrency(
      originalAmount,
      originalCurrency,
      targetCurrency,
    )

    const paymentIntent =
      refund.payment_intent && typeof refund.payment_intent !== 'string'
        ? refund.payment_intent
        : null

    const meta = paymentIntent?.metadata || refund.metadata || {}

    const profileId = (meta as any).swetrix_profile_id || null
    const sessionId = (meta as any).swetrix_session_id || null

    const revenueTransaction: RevenueTransaction = {
      pid: projectId,
      transactionId: refund.id,
      provider: RevenueProvider.STRIPE,
      type: RevenueType.REFUND,
      status: RevenueStatus.REFUNDED,
      amount: -Math.abs(amount),
      originalAmount: -Math.abs(originalAmount),
      originalCurrency,
      currency: targetCurrency,
      profileId,
      sessionId,
      customerEmail: null,
      productId: null,
      productName: 'Refund',
      metadata: {
        ...(meta || {}),
        originalPaymentIntentId:
          paymentIntent && typeof paymentIntent !== 'string'
            ? paymentIntent.id
            : undefined,
      },
      created: new Date(refund.created * 1000),
      syncedAt: new Date(),
    }

    await this.revenueService.insertTransaction(revenueTransaction)
  }

  private convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): number {
    if (fromCurrency === toCurrency) {
      return amount
    }

    const rates: Record<string, number> = {
      USD: 1,
      EUR: 1.08,
      GBP: 1.27,
      CAD: 0.74,
      AUD: 0.66,
      JPY: 0.0067,
    }

    const fromRate = rates[fromCurrency] || 1
    const toRate = rates[toCurrency] || 1

    const usdAmount = amount * fromRate
    return usdAmount / toRate
  }
}
