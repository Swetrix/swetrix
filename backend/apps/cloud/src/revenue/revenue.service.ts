import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import _round from 'lodash/round'
import dayjs from 'dayjs'
import * as crypto from 'crypto'

import { Project } from '../project/entity/project.entity'
import { clickhouse } from '../common/integrations/clickhouse'
import { AppLoggerService } from '../logger/logger.service'
import {
  RevenueTransaction,
  PADDLE_REQUIRED_PERMISSIONS,
} from './interfaces/revenue.interface'
import {
  RevenueStatsDto,
  RevenueChartDto,
  RevenueTransactionDto,
} from './dto/revenue-stats.dto'
import { deriveKey } from '../common/utils'

const timeBucketConversion: Record<string, string> = {
  minute: 'toStartOfMinute',
  hour: 'toStartOfHour',
  day: 'toStartOfDay',
  month: 'toStartOfMonth',
  year: 'toStartOfYear',
}

@Injectable()
export class RevenueService {
  private readonly encryptionKey: Buffer

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly logger: AppLoggerService,
  ) {
    const secret = deriveKey('revenue', 32)
    this.encryptionKey = crypto.scryptSync(secret, 'revenue-salt', 32)
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.encryptionKey,
      iv,
    )
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  async connectPaddle(
    projectId: string,
    apiKey: string,
    currency: string = 'USD',
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Encrypt the API key before storing
      const encryptedKey = this.encrypt(apiKey)

      await this.projectRepository.update(projectId, {
        paddleApiKeyEnc: encryptedKey,
        stripeApiKeyEnc: null,
        revenueCurrency: currency,
        paddleApiKeyPermissions: JSON.stringify(PADDLE_REQUIRED_PERMISSIONS),
        stripeApiKeyPermissions: null,
        revenueLastSyncAt: null,
      })

      return { success: true }
    } catch (error) {
      this.logger.error({ error, projectId }, 'Failed to connect Paddle')
      return { success: false, message: 'Failed to save Paddle configuration' }
    }
  }

  async connectStripe(
    projectId: string,
    apiKey: string,
    currency: string = 'USD',
    permissions: string[] = [],
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const encryptedKey = this.encrypt(apiKey)

      await this.projectRepository.update(projectId, {
        stripeApiKeyEnc: encryptedKey,
        paddleApiKeyEnc: null,
        revenueCurrency: currency,
        stripeApiKeyPermissions: JSON.stringify(permissions),
        paddleApiKeyPermissions: null,
        revenueLastSyncAt: null,
      })

      return { success: true }
    } catch (error) {
      this.logger.error({ error, projectId }, 'Failed to connect Stripe')
      return { success: false, message: 'Failed to save Stripe configuration' }
    }
  }

  async disconnectPaddle(projectId: string): Promise<void> {
    await this.projectRepository.update(projectId, {
      paddleApiKeyEnc: null,
      paddleApiKeyPermissions: null,
      revenueLastSyncAt: null,
    })
  }

  async disconnectStripe(projectId: string): Promise<void> {
    await this.projectRepository.update(projectId, {
      stripeApiKeyEnc: null,
      stripeApiKeyPermissions: null,
      revenueLastSyncAt: null,
    })
  }

  async disconnectRevenue(projectId: string): Promise<void> {
    await this.projectRepository.update(projectId, {
      paddleApiKeyEnc: null,
      paddleApiKeyPermissions: null,
      stripeApiKeyEnc: null,
      stripeApiKeyPermissions: null,
      revenueLastSyncAt: null,
    })
  }

  async getRevenueStatus(project: Project): Promise<{
    connected: boolean
    provider?: string
    currency?: string
    lastSyncAt?: string
  }> {
    const connected = !!project.paddleApiKeyEnc || !!project.stripeApiKeyEnc
    return {
      connected,
      provider: connected
        ? project.paddleApiKeyEnc
          ? 'paddle'
          : 'stripe'
        : undefined,
      currency: project.revenueCurrency || undefined,
      lastSyncAt: project.revenueLastSyncAt?.toISOString() || undefined,
    }
  }

  async updateCurrency(projectId: string, currency: string): Promise<void> {
    await this.projectRepository.update(projectId, {
      revenueCurrency: currency,
      revenueLastSyncAt: null, // Reset sync so all transactions are re-converted
    })
  }

  getPaddleApiKey(project: Project): string | null {
    if (!project.paddleApiKeyEnc) {
      return null
    }
    try {
      return this.decrypt(project.paddleApiKeyEnc)
    } catch {
      return null
    }
  }

  getStripeApiKey(project: Project): string | null {
    if (!project.stripeApiKeyEnc) {
      return null
    }
    try {
      return this.decrypt(project.stripeApiKeyEnc)
    } catch {
      return null
    }
  }

  async getRevenueStats(
    projectId: string,
    groupFromUTC: string,
    groupToUTC: string,
    currency: string,
  ): Promise<RevenueStatsDto> {
    // Get current period stats
    const statsQuery = `
      SELECT
        sum(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as totalRevenue,
        count(CASE WHEN type = 'sale' THEN 1 ELSE NULL END) as salesCount,
        count(CASE WHEN type = 'refund' THEN 1 ELSE NULL END) as refundsCount,
        sum(CASE WHEN type = 'refund' THEN abs(amount) ELSE 0 END) as refundsAmount,
        sum(CASE WHEN type = 'subscription' THEN amount ELSE 0 END) as subscriptionRevenue
      FROM (
        SELECT
          pid,
          transaction_id,
          argMax(type, synced_at) as type,
          argMax(amount, synced_at) as amount,
          argMax(created, synced_at) as created_at
        FROM revenue
        WHERE
          pid = {pid:FixedString(12)}
          AND revenue.created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY pid, transaction_id
      ) AS latest
    `

    const { data: statsData } = await clickhouse
      .query({
        query: statsQuery,
        query_params: {
          pid: projectId,
          groupFrom: groupFromUTC,
          groupTo: groupToUTC,
        },
      })
      .then(resultSet =>
        resultSet.json<{
          totalRevenue: number
          salesCount: number
          refundsCount: number
          refundsAmount: number
          subscriptionRevenue: number
        }>(),
      )

    const stats = statsData[0] || {
      totalRevenue: 0,
      salesCount: 0,
      refundsCount: 0,
      refundsAmount: 0,
      subscriptionRevenue: 0,
    }

    // Calculate average order value
    const averageOrderValue =
      stats.salesCount > 0
        ? _round(stats.totalRevenue / stats.salesCount, 2)
        : 0

    // Estimate MRR from subscription revenue (simple calculation)
    // In a real implementation, this would need more sophisticated logic
    const mrr = _round(stats.subscriptionRevenue, 2)

    // Get previous period stats for comparison
    const periodDays = dayjs(groupToUTC).diff(dayjs(groupFromUTC), 'day') || 1
    const previousFrom = dayjs(groupFromUTC)
      .subtract(periodDays, 'day')
      .format('YYYY-MM-DD HH:mm:ss')

    const { data: previousData } = await clickhouse
      .query({
        query: statsQuery,
        query_params: {
          pid: projectId,
          groupFrom: previousFrom,
          groupTo: groupFromUTC,
        },
      })
      .then(resultSet => resultSet.json<{ totalRevenue: number }>())

    const previousRevenue = previousData[0]?.totalRevenue || 0
    const revenueChange =
      previousRevenue > 0
        ? _round(
            ((stats.totalRevenue - previousRevenue) / previousRevenue) * 100,
            2,
          )
        : stats.totalRevenue > 0
          ? 100
          : 0

    return {
      totalRevenue: _round(stats.totalRevenue, 2),
      salesCount: stats.salesCount,
      refundsCount: stats.refundsCount,
      refundsAmount: _round(stats.refundsAmount, 2),
      averageOrderValue,
      currency,
      mrr,
      revenueChange,
    }
  }

  async getRevenueChart(
    projectId: string,
    groupFromUTC: string,
    groupToUTC: string,
    timeBucket: string,
    timezone: string,
    xAxis: string[],
  ): Promise<RevenueChartDto> {
    const timeBucketFunc = timeBucketConversion[timeBucket] || 'toStartOfDay'
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)

    const chartQuery = `
      SELECT
        ${selector},
        sum(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as revenue,
        count(CASE WHEN type = 'sale' THEN 1 ELSE NULL END) as salesCount,
        sum(CASE WHEN type = 'refund' THEN abs(amount) ELSE 0 END) as refundsAmount
      FROM (
        SELECT
          pid,
          transaction_id,
          argMax(type, synced_at) as type,
          argMax(amount, synced_at) as amount,
          argMax(created, synced_at) as created_at,
          ${timeBucketFunc}(toTimeZone(argMax(created, synced_at), {timezone:String})) as tz_created
        FROM revenue
        WHERE
          pid = {pid:FixedString(12)}
          AND revenue.created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY pid, transaction_id
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `

    const { data } = await clickhouse
      .query({
        query: chartQuery,
        query_params: {
          pid: projectId,
          groupFrom: groupFromUTC,
          groupTo: groupToUTC,
          timezone,
        },
      })
      .then(resultSet =>
        resultSet.json<{
          year: number
          month?: number
          day?: number
          hour?: number
          minute?: number
          revenue: number
          salesCount: number
          refundsAmount: number
        }>(),
      )

    // Initialize arrays with zeros
    const revenue = Array(xAxis.length).fill(0)
    const salesCount = Array(xAxis.length).fill(0)
    const refundsAmount = Array(xAxis.length).fill(0)

    // Fill in actual data
    for (const row of data) {
      const dateString = this.generateDateString(row)
      const index = xAxis.indexOf(dateString)

      if (index !== -1) {
        revenue[index] = _round(row.revenue, 2)
        salesCount[index] = row.salesCount
        refundsAmount[index] = _round(row.refundsAmount, 2)
      }
    }

    return {
      x: xAxis,
      revenue,
      salesCount,
      refundsAmount,
    }
  }

  async getRevenueTransactions(
    projectId: string,
    groupFromUTC: string,
    groupToUTC: string,
    take: number = 20,
    skip: number = 0,
    type?: string,
    status?: string,
  ): Promise<{ transactions: RevenueTransactionDto[]; total: number }> {
    const params: Record<string, unknown> = {
      pid: projectId,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
    }

    // Build filters for the "latest-per-transaction" view
    const filters: string[] = []
    if (type) {
      filters.push(`type = {type:String}`)
      params.type = type
    }

    if (status) {
      filters.push(`status = {status:String}`)
      params.status = status
    }

    const filtersSql = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT count(*) as total
      FROM (
        SELECT
          pid,
          transaction_id,
          argMax(provider, synced_at) as provider,
          argMax(type, synced_at) as type,
          argMax(status, synced_at) as status,
          argMax(amount, synced_at) as amount,
          argMax(currency, synced_at) as currency,
          argMax(original_amount, synced_at) as original_amount,
          argMax(original_currency, synced_at) as original_currency,
          argMax(product_name, synced_at) as product_name,
          argMax(profile_id, synced_at) as profile_id,
          argMax(session_id, synced_at) as session_id,
          argMax(created, synced_at) as created_at
        FROM revenue
        WHERE
          pid = {pid:FixedString(12)}
          AND revenue.created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY pid, transaction_id
      ) AS latest
      ${filtersSql}
    `
    const { data: countData } = await clickhouse
      .query({ query: countQuery, query_params: params })
      .then(resultSet => resultSet.json<{ total: number }>())

    // Get transactions
    const transactionsQuery = `
      SELECT
        transaction_id,
        provider,
        type,
        status,
        amount,
        currency,
        original_amount,
        original_currency,
        product_name,
        profile_id,
        session_id,
        created_at as created
      FROM (
        SELECT
          pid,
          transaction_id,
          argMax(provider, synced_at) as provider,
          argMax(type, synced_at) as type,
          argMax(status, synced_at) as status,
          argMax(amount, synced_at) as amount,
          argMax(currency, synced_at) as currency,
          argMax(original_amount, synced_at) as original_amount,
          argMax(original_currency, synced_at) as original_currency,
          argMax(product_name, synced_at) as product_name,
          argMax(profile_id, synced_at) as profile_id,
          argMax(session_id, synced_at) as session_id,
          argMax(created, synced_at) as created_at
        FROM revenue
        WHERE
          pid = {pid:FixedString(12)}
          AND revenue.created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY pid, transaction_id
      ) AS latest
      ${filtersSql}
      ORDER BY created_at DESC
      LIMIT {take:UInt32} OFFSET {skip:UInt32}
    `

    const { data } = await clickhouse
      .query({
        query: transactionsQuery,
        query_params: { ...params, take, skip },
      })
      .then(resultSet =>
        resultSet.json<{
          transaction_id: string
          provider: string
          type: string
          status: string
          amount: number
          currency: string
          original_amount: number
          original_currency: string
          product_name: string | null
          profile_id: string | null
          session_id: string | null
          created: string
        }>(),
      )

    const transactions: RevenueTransactionDto[] = data.map(row => ({
      transactionId: row.transaction_id,
      provider: row.provider,
      type: row.type,
      status: row.status,
      amount: _round(row.amount, 2),
      currency: row.currency,
      originalAmount: _round(row.original_amount, 2),
      originalCurrency: row.original_currency,
      productName: row.product_name || undefined,
      profileId: row.profile_id || undefined,
      sessionId: row.session_id || undefined,
      created: row.created,
    }))

    return {
      transactions,
      total: countData[0]?.total || 0,
    }
  }

  async insertTransaction(transaction: RevenueTransaction): Promise<void> {
    // Format date for ClickHouse DateTime (YYYY-MM-DD HH:mm:ss)
    const formatDateForCH = (date: Date): string => {
      return date
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '')
    }

    await clickhouse.insert({
      table: 'revenue',
      values: [
        {
          pid: transaction.pid,
          transaction_id: transaction.transactionId,
          provider: transaction.provider,
          type: transaction.type,
          status: transaction.status,
          amount: transaction.amount,
          original_amount: transaction.originalAmount,
          original_currency: transaction.originalCurrency,
          currency: transaction.currency,
          profile_id: transaction.profileId || null,
          session_id: transaction.sessionId || null,
          product_id: transaction.productId || null,
          product_name: transaction.productName || null,
          metadata: JSON.stringify(transaction.metadata || {}),
          created: formatDateForCH(transaction.created),
          synced_at: formatDateForCH(transaction.syncedAt),
        },
      ],
      format: 'JSONEachRow',
    })
  }

  async updateLastSyncAt(projectId: string): Promise<void> {
    await this.projectRepository.update(projectId, {
      revenueLastSyncAt: new Date(),
    })
  }

  private getGroupSubquery(
    timeBucket: string,
  ): [selector: string, groupBy: string] {
    if (timeBucket === 'minute') {
      return [
        'toYear(tz_created) as year, toMonth(tz_created) as month, toDayOfMonth(tz_created) as day, toHour(tz_created) as hour, toMinute(tz_created) as minute',
        'year, month, day, hour, minute',
      ]
    }

    if (timeBucket === 'hour') {
      return [
        'toYear(tz_created) as year, toMonth(tz_created) as month, toDayOfMonth(tz_created) as day, toHour(tz_created) as hour',
        'year, month, day, hour',
      ]
    }

    if (timeBucket === 'day') {
      return [
        'toYear(tz_created) as year, toMonth(tz_created) as month, toDayOfMonth(tz_created) as day',
        'year, month, day',
      ]
    }

    if (timeBucket === 'month') {
      return [
        'toYear(tz_created) as year, toMonth(tz_created) as month',
        'year, month',
      ]
    }

    // year
    return ['toYear(tz_created) as year', 'year']
  }

  private generateDateString(row: { [key: string]: number }): string {
    const { year, month, day, hour, minute } = row

    let dateString = `${year}`

    if (typeof month === 'number') {
      if (month < 10) {
        dateString += `-0${month}`
      } else {
        dateString += `-${month}`
      }
    }

    if (typeof day === 'number') {
      if (day < 10) {
        dateString += `-0${day}`
      } else {
        dateString += `-${day}`
      }
    }

    if (typeof hour === 'number') {
      const strMinute =
        typeof minute === 'number'
          ? minute < 10
            ? `0${minute}`
            : minute
          : '00'

      if (hour < 10) {
        dateString += ` 0${hour}:${strMinute}:00`
      } else {
        dateString += ` ${hour}:${strMinute}:00`
      }
    }

    return dateString
  }
}
