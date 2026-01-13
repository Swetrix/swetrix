import { Injectable } from '@nestjs/common'
import { AppLoggerService } from '../../logger/logger.service'
import { RevenueService } from '../revenue.service'
import { CurrencyService } from '../currency.service'
import {
  RevenueProvider,
  RevenueType,
  RevenueStatus,
  RevenueTransaction,
} from '../interfaces/revenue.interface'

interface PaddleTransaction {
  id: string
  status: string
  customer_id: string | null
  currency_code: string
  details: {
    totals: {
      total: string
      subtotal: string
      tax: string
    }
    line_items?: {
      product: {
        id: string
        name: string
      }
      price: {
        id: string
        billing_cycle: {
          interval: string
          frequency: number
        } | null
      }
    }[]
  }
  checkout: {
    url: string | null
  } | null
  custom_data?: {
    swetrix_profile_id?: string
    swetrix_session_id?: string
    [key: string]: unknown
  }
  created_at: string
  updated_at: string
  billed_at: string | null
}

interface PaddleAdjustment {
  id: string
  transaction_id: string
  action: string
  status: string
  totals: {
    total: string
    subtotal: string
    tax: string
    currency_code: string
  }
  reason: string
  created_at: string
}

interface PaddleListResponse<T> {
  data: T[]
  meta: {
    request_id: string
    pagination?: {
      per_page: number
      next?: string
      has_more: boolean
      estimated_total?: number
    }
  }
}

@Injectable()
export class PaddleAdapter {
  private readonly baseUrl = 'https://api.paddle.com'
  private readonly PADDLE_REQUEST_TIMEOUT = 20000

  constructor(
    private readonly logger: AppLoggerService,
    private readonly revenueService: RevenueService,
    private readonly currencyService: CurrencyService,
  ) {}

  async validateApiKey(
    apiKey: string,
    timeoutMs = this.PADDLE_REQUEST_TIMEOUT,
  ): Promise<boolean> {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl}/event-types`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      return response.ok
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error('Paddle API request timed out')
      } else {
        this.logger.error({ error }, 'Failed to validate Paddle API key')
      }
      return false
    } finally {
      clearTimeout(timeout)
    }
  }

  async syncTransactions(
    projectId: string,
    apiKey: string,
    currency: string,
    lastSyncAt?: Date,
  ): Promise<number> {
    let syncedCount = 0

    try {
      // Small overlap window to avoid missing edge updates due to timestamp truncation
      // and provider-side timing differences.
      const effectiveLastSyncAt =
        lastSyncAt instanceof Date && !isNaN(lastSyncAt.getTime())
          ? new Date(lastSyncAt.getTime() - 60 * 1000)
          : undefined

      // Fetch transactions
      const transactions = await this.fetchTransactions(
        apiKey,
        effectiveLastSyncAt,
      )

      for (const transaction of transactions) {
        await this.processTransaction(projectId, transaction, currency)
        syncedCount++
      }

      // Fetch adjustments (refunds)
      const adjustments = await this.fetchAdjustments(
        apiKey,
        effectiveLastSyncAt,
      )

      for (const adjustment of adjustments) {
        await this.processAdjustment(projectId, adjustment, currency)
        syncedCount++
      }

      this.logger.log({ projectId, syncedCount }, 'Paddle sync completed')
    } catch (error) {
      this.logger.error(
        { error, projectId },
        'Failed to sync Paddle transactions',
      )
      throw error
    }

    return syncedCount
  }

  private async fetchTransactions(
    apiKey: string,
    after?: Date,
  ): Promise<PaddleTransaction[]> {
    const transactions: PaddleTransaction[] = []
    let cursor: string | undefined

    do {
      const params = new URLSearchParams({
        per_page: '50',
      })

      // Paddle API: pass each status value separately
      params.append('status', 'completed')
      params.append('status', 'billed')

      if (after && after instanceof Date && !isNaN(after.getTime())) {
        // Use RFC 3339 format without milliseconds
        params.append(
          'updated_at[gte]',
          after.toISOString().split('.')[0] + 'Z',
        )
      }

      if (cursor && cursor.length > 0) {
        params.append('after', cursor)
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, this.PADDLE_REQUEST_TIMEOUT)

      let response: Response
      try {
        response = await fetch(
          `${this.baseUrl}/transactions?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        )
      } catch (error) {
        if (error.name === 'AbortError') {
          this.logger.error(
            'Paddle API request timed out fetching transactions',
          )
          throw new Error('Paddle API request timed out')
        }
        throw error
      } finally {
        clearTimeout(timeout)
      }

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error(
          { status: response.status, error: errorText },
          'Paddle API error fetching transactions',
        )
        throw new Error(`Paddle API error: ${response.status}`)
      }

      const data: PaddleListResponse<PaddleTransaction> = await response.json()
      transactions.push(...data.data)

      // Only set cursor if has_more is true and next is valid
      cursor =
        data.meta.pagination?.has_more && data.meta.pagination?.next
          ? data.meta.pagination.next
          : undefined
    } while (cursor)

    return transactions
  }

  private async fetchAdjustments(
    apiKey: string,
    after?: Date,
  ): Promise<PaddleAdjustment[]> {
    const adjustments: PaddleAdjustment[] = []
    let cursor: string | undefined

    do {
      const params = new URLSearchParams({
        action: 'refund',
        status: 'approved',
        per_page: '50',
      })

      if (after && after instanceof Date && !isNaN(after.getTime())) {
        // Use RFC 3339 format without milliseconds
        params.append(
          'updated_at[gte]',
          after.toISOString().split('.')[0] + 'Z',
        )
      }

      if (cursor && cursor.length > 0) {
        params.append('after', cursor)
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, this.PADDLE_REQUEST_TIMEOUT)

      let response: Response
      try {
        response = await fetch(
          `${this.baseUrl}/adjustments?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        )
      } catch (error) {
        if (error.name === 'AbortError') {
          this.logger.error('Paddle API request timed out fetching adjustments')
          throw new Error('Paddle API request timed out')
        }
        throw error
      } finally {
        clearTimeout(timeout)
      }

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error(
          { status: response.status, error: errorText },
          'Paddle API error fetching adjustments',
        )
        throw new Error(`Paddle API error: ${response.status}`)
      }

      const data: PaddleListResponse<PaddleAdjustment> = await response.json()
      adjustments.push(...data.data)

      // Only set cursor if has_more is true and next is valid
      cursor =
        data.meta.pagination?.has_more && data.meta.pagination?.next
          ? data.meta.pagination.next
          : undefined
    } while (cursor)

    return adjustments
  }

  private async processTransaction(
    projectId: string,
    transaction: PaddleTransaction,
    targetCurrency: string,
  ): Promise<void> {
    const originalAmount = parseFloat(transaction.details.totals.total) / 100
    const originalCurrency = transaction.currency_code

    // Determine transaction type
    let type = RevenueType.SALE
    const lineItems = transaction.details.line_items || []
    if (lineItems.some((item) => item?.price?.billing_cycle != null)) {
      type = RevenueType.SUBSCRIPTION
    }

    // Convert currency
    const amount = await this.currencyService.convert(
      originalAmount,
      originalCurrency,
      targetCurrency,
    )

    const productName = lineItems[0]?.product?.name || null
    const productId = lineItems[0]?.product?.id || null

    // Extract attribution data from custom_data
    const profileId = transaction.custom_data?.swetrix_profile_id || null
    const sessionId = transaction.custom_data?.swetrix_session_id || null

    const revenueTransaction: RevenueTransaction = {
      pid: projectId,
      transactionId: transaction.id,
      provider: RevenueProvider.PADDLE,
      type,
      status: RevenueStatus.COMPLETED,
      amount,
      originalAmount,
      originalCurrency,
      currency: targetCurrency,
      profileId,
      sessionId,
      productId,
      productName,
      metadata: transaction.custom_data || {},
      created: new Date(transaction.billed_at || transaction.created_at),
      syncedAt: new Date(),
    }

    await this.revenueService.insertTransaction(revenueTransaction)
  }

  private async processAdjustment(
    projectId: string,
    adjustment: PaddleAdjustment,
    targetCurrency: string,
  ): Promise<void> {
    const originalAmount = parseFloat(adjustment.totals.total) / 100
    const originalCurrency = adjustment.totals.currency_code

    const amount = await this.currencyService.convert(
      originalAmount,
      originalCurrency,
      targetCurrency,
    )

    const revenueTransaction: RevenueTransaction = {
      pid: projectId,
      transactionId: adjustment.id,
      provider: RevenueProvider.PADDLE,
      type: RevenueType.REFUND,
      status: RevenueStatus.REFUNDED,
      amount: -Math.abs(amount), // Refunds are negative
      originalAmount: -Math.abs(originalAmount),
      originalCurrency,
      currency: targetCurrency,
      profileId: null,
      sessionId: null,
      productId: null,
      productName: adjustment.reason || 'Refund',
      metadata: { originalTransactionId: adjustment.transaction_id },
      created: new Date(adjustment.created_at),
      syncedAt: new Date(),
    }

    await this.revenueService.insertTransaction(revenueTransaction)
  }
}
