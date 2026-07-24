import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm'

import { redis } from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { Organisation } from '../organisation/entity/organisation.entity'
import {
  OrganisationMember,
  OrganisationRole,
} from '../organisation/entity/organisation-member.entity'
import { Project } from '../project/entity/project.entity'
import { CancellationFeedback } from '../user/entities/cancellation-feedback.entity'
import { DeleteFeedback } from '../user/entities/delete-feedback.entity'
import {
  ACCOUNT_PLANS,
  BillingFrequency,
  getEffectiveAccountLimits,
  getEffectivePlanType,
  PlanCode,
  PlanType,
  User,
} from '../user/entities/user.entity'
import { UserFeedback } from '../user/entities/user-feedback.entity'

// Event types that count towards project activity (parity with the analytics views)
const ACTIVITY_EVENT_TYPES = [
  'pageview',
  'custom_event',
  'error',
  'captcha',
  'performance',
]

// Billable usage condition - keep in sync with task-manager's plan usage query
const CAPTCHA_PASS_CONDITION =
  "type = 'captcha' AND if(indexOf(`meta.key`, 'captcha_event') = 0, 'pass', arrayElement(`meta.value`, indexOf(`meta.key`, 'captcha_event'))) = 'pass'"

const BILLABLE_COUNT_IF = `countIf(type IN ('pageview', 'custom_event', 'error') OR (${CAPTCHA_PASS_CONDITION}))`

const FREE_PLAN_CODES = [PlanCode.none, PlanCode.free, PlanCode.trial]

const USERS_PAGE_SIZE = 25
const PROJECTS_PAGE_SIZE = 25
const ORGANISATIONS_PAGE_SIZE = 25
const FEEDBACK_PAGE_SIZE = 20

export type FeedbackType = 'user' | 'cancellation' | 'deletion'

interface CurrencyAmounts {
  USD: number
  EUR: number
  GBP: number
}

interface PlanPricing {
  monthly: CurrencyAmounts
  yearly: CurrencyAmounts
}

// List prices per plan (mirrors web/app/lib/pricing/catalog.ts) - used for MRR estimates
const STANDARD_PLAN_PRICES: Partial<Record<PlanCode, PlanPricing>> = {
  [PlanCode.hobby]: {
    monthly: { USD: 5, EUR: 5, GBP: 4 },
    yearly: { USD: 50, EUR: 50, GBP: 40 },
  },
  [PlanCode['50k']]: {
    monthly: { USD: 12, EUR: 10, GBP: 10 },
    yearly: { USD: 120, EUR: 100, GBP: 100 },
  },
  [PlanCode.freelancer]: {
    monthly: { USD: 15, EUR: 15, GBP: 14 },
    yearly: { USD: 150, EUR: 150, GBP: 140 },
  },
  [PlanCode['100k']]: {
    monthly: { USD: 19, EUR: 17, GBP: 15 },
    yearly: { USD: 190, EUR: 170, GBP: 150 },
  },
  [PlanCode['200k']]: {
    monthly: { USD: 29, EUR: 25, GBP: 23 },
    yearly: { USD: 290, EUR: 250, GBP: 230 },
  },
  [PlanCode['500k']]: {
    monthly: { USD: 49, EUR: 42, GBP: 39 },
    yearly: { USD: 490, EUR: 420, GBP: 390 },
  },
  [PlanCode['1m']]: {
    monthly: { USD: 79, EUR: 69, GBP: 59 },
    yearly: { USD: 790, EUR: 690, GBP: 590 },
  },
  [PlanCode['2m']]: {
    monthly: { USD: 119, EUR: 99, GBP: 89 },
    yearly: { USD: 1190, EUR: 990, GBP: 890 },
  },
  [PlanCode['5m']]: {
    monthly: { USD: 179, EUR: 149, GBP: 139 },
    yearly: { USD: 1790, EUR: 1490, GBP: 1390 },
  },
  [PlanCode['10m']]: {
    monthly: { USD: 249, EUR: 209, GBP: 189 },
    yearly: { USD: 2490, EUR: 2090, GBP: 1890 },
  },
  [PlanCode['15m']]: {
    monthly: { USD: 349, EUR: 299, GBP: 259 },
    yearly: { USD: 3490, EUR: 2990, GBP: 2590 },
  },
  [PlanCode['20m']]: {
    monthly: { USD: 419, EUR: 359, GBP: 319 },
    yearly: { USD: 4190, EUR: 3590, GBP: 3190 },
  },
  [PlanCode['30m']]: {
    monthly: { USD: 519, EUR: 449, GBP: 389 },
    yearly: { USD: 5190, EUR: 4490, GBP: 3890 },
  },
  [PlanCode['40m']]: {
    monthly: { USD: 619, EUR: 529, GBP: 459 },
    yearly: { USD: 6190, EUR: 5290, GBP: 4590 },
  },
  [PlanCode['50m']]: {
    monthly: { USD: 719, EUR: 619, GBP: 539 },
    yearly: { USD: 7190, EUR: 6190, GBP: 5390 },
  },
}

const PLUS_PLAN_PRICES: Partial<Record<PlanCode, PlanPricing>> = {
  [PlanCode['100k']]: {
    monthly: { USD: 39, EUR: 35, GBP: 29 },
    yearly: { USD: 390, EUR: 350, GBP: 290 },
  },
  [PlanCode['200k']]: {
    monthly: { USD: 59, EUR: 49, GBP: 45 },
    yearly: { USD: 590, EUR: 490, GBP: 450 },
  },
  [PlanCode['500k']]: {
    monthly: { USD: 109, EUR: 95, GBP: 79 },
    yearly: { USD: 1090, EUR: 950, GBP: 790 },
  },
  [PlanCode['1m']]: {
    monthly: { USD: 179, EUR: 159, GBP: 135 },
    yearly: { USD: 1790, EUR: 1590, GBP: 1350 },
  },
  [PlanCode['2m']]: {
    monthly: { USD: 279, EUR: 239, GBP: 209 },
    yearly: { USD: 2790, EUR: 2390, GBP: 2090 },
  },
  [PlanCode['5m']]: {
    monthly: { USD: 439, EUR: 379, GBP: 329 },
    yearly: { USD: 4390, EUR: 3790, GBP: 3290 },
  },
  [PlanCode['10m']]: {
    monthly: { USD: 629, EUR: 539, GBP: 469 },
    yearly: { USD: 6290, EUR: 5390, GBP: 4690 },
  },
  [PlanCode['15m']]: {
    monthly: { USD: 919, EUR: 799, GBP: 699 },
    yearly: { USD: 9190, EUR: 7990, GBP: 6990 },
  },
  [PlanCode['20m']]: {
    monthly: { USD: 1139, EUR: 979, GBP: 849 },
    yearly: { USD: 11390, EUR: 9790, GBP: 8490 },
  },
  [PlanCode['30m']]: {
    monthly: { USD: 1459, EUR: 1249, GBP: 1079 },
    yearly: { USD: 14590, EUR: 12490, GBP: 10790 },
  },
  [PlanCode['40m']]: {
    monthly: { USD: 1799, EUR: 1549, GBP: 1329 },
    yearly: { USD: 17990, EUR: 15490, GBP: 13290 },
  },
  [PlanCode['50m']]: {
    monthly: { USD: 2159, EUR: 1859, GBP: 1599 },
    yearly: { USD: 21590, EUR: 18590, GBP: 15990 },
  },
}

type SupportedCurrency = keyof CurrencyAmounts

const { PADDLE_VENDOR_ID, PADDLE_API_KEY } = process.env

// v2: stores raw payments instead of derived summaries
const REVENUE_CACHE_KEY = 'admin:paddle-payments:v2'
// Paddle's vendor API is rate limited; the numbers do not move fast anyway
const REVENUE_CACHE_TTL_SECONDS = 3600

// Rough, static FX rates used only to produce a single comparable USD number
const APPROX_USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
}

interface PaddlePayment {
  id: number
  subscription_id: number
  amount: number
  currency: string
  payout_date: string
  is_paid: number
  is_one_off_charge: boolean | number
  receipt_url?: string
}

const CHURN_RISK_MIN_PREV_EVENTS = 100
const CHURN_RISK_MIN_DROP = 0.5

export interface RevenueBucket {
  byCurrency: Record<string, number>
  approxUsd: number
  payments: number
  oneOffPayments: number
  payers: number
}

interface MrrSubscription {
  planCode: PlanCode
  planType: PlanType | null
  billingFrequency: BillingFrequency | null
  tierCurrency: string | null
}

export type UsersFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'paid'
  | 'trial'
  | 'free'
  | 'cancelling'
  | 'suspended'
  | 'blocked'

export type ProjectsFilter =
  | 'all'
  | 'active'
  | 'archived'
  | 'inactive-30'
  | 'inactive-60'
  | 'inactive-90'

const dateToChDateTime = (date: Date): string =>
  date.toISOString().slice(0, 19).replace('T', ' ')

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
    @InjectRepository(OrganisationMember)
    private readonly organisationMemberRepository: Repository<OrganisationMember>,
    @InjectRepository(UserFeedback)
    private readonly userFeedbackRepository: Repository<UserFeedback>,
    @InjectRepository(DeleteFeedback)
    private readonly deleteFeedbackRepository: Repository<DeleteFeedback>,
    @InjectRepository(CancellationFeedback)
    private readonly cancellationFeedbackRepository: Repository<CancellationFeedback>,
  ) {}

  // -------------------- MRR --------------------

  private getMonthlyRevenue(
    subscription: MrrSubscription,
  ): { currency: SupportedCurrency; amount: number; usdAmount: number } | null {
    const { planCode, billingFrequency, tierCurrency } = subscription

    if (FREE_PLAN_CODES.includes(planCode)) {
      return null
    }

    const planType = getEffectivePlanType(subscription)
    const priceTable =
      planType === PlanType.plus ? PLUS_PLAN_PRICES : STANDARD_PLAN_PRICES
    const pricing = priceTable[planCode]

    if (!pricing) {
      return null
    }

    const currency: SupportedCurrency = ['USD', 'EUR', 'GBP'].includes(
      tierCurrency as string,
    )
      ? (tierCurrency as SupportedCurrency)
      : 'USD'

    const isYearly = billingFrequency === BillingFrequency.Yearly
    const amount = isYearly
      ? pricing.yearly[currency] / 12
      : pricing.monthly[currency]
    const usdAmount = isYearly ? pricing.yearly.USD / 12 : pricing.monthly.USD

    return { currency, amount, usdAmount }
  }

  private async calculateMrr() {
    const paidUsers = await this.userRepository.find({
      where: { planCode: Not(In(FREE_PLAN_CODES)) },
      select: [
        'id',
        'planCode',
        'planType',
        'billingFrequency',
        'tierCurrency',
      ],
    })

    const byCurrency: Record<SupportedCurrency, number> = {
      USD: 0,
      EUR: 0,
      GBP: 0,
    }
    let usdEquivalent = 0
    let unpricedSubscriptions = 0

    for (const user of paidUsers) {
      const revenue = this.getMonthlyRevenue(user)

      if (!revenue) {
        unpricedSubscriptions += 1
        continue
      }

      byCurrency[revenue.currency] += revenue.amount
      usdEquivalent += revenue.usdAmount
    }

    return {
      byCurrency: {
        USD: Math.round(byCurrency.USD * 100) / 100,
        EUR: Math.round(byCurrency.EUR * 100) / 100,
        GBP: Math.round(byCurrency.GBP * 100) / 100,
      },
      // Every subscription valued at its USD list price; an estimate, not accounting data
      usdEquivalent: Math.round(usdEquivalent * 100) / 100,
      payingUsers: paidUsers.length,
      unpricedSubscriptions,
    }
  }

  // -------------------- Revenue (Paddle) --------------------

  private async fetchPaddlePayments(
    from: string,
    to: string,
    isPaid: 0 | 1,
  ): Promise<PaddlePayment[]> {
    const body = new URLSearchParams()
    body.set('vendor_id', String(Number(PADDLE_VENDOR_ID)))
    body.set('vendor_auth_code', PADDLE_API_KEY)
    body.set('is_paid', String(isPaid))
    body.set('from', from)
    body.set('to', to)

    const res = await fetch(
      'https://vendors.paddle.com/api/2.0/subscription/payments',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    )

    const data = await res.json()

    if (!res.ok || !data?.success) {
      throw new Error(
        `Paddle payments request failed: ${JSON.stringify(data?.error || data)}`,
      )
    }

    return data.response || []
  }

  private summariseRevenue(payments: PaddlePayment[]): RevenueBucket {
    const byCurrency: Record<string, number> = {}
    const payerIds = new Set<number>()
    let approxUsd = 0
    let oneOffPayments = 0

    for (const payment of payments) {
      const amount = Number(payment.amount) || 0
      const currency = payment.currency || 'USD'

      byCurrency[currency] = (byCurrency[currency] || 0) + amount
      approxUsd += amount * (APPROX_USD_RATES[currency] ?? 1)
      payerIds.add(payment.subscription_id)

      if (payment.is_one_off_charge) {
        oneOffPayments += 1
      }
    }

    for (const currency of Object.keys(byCurrency)) {
      byCurrency[currency] = Math.round(byCurrency[currency] * 100) / 100
    }

    return {
      byCurrency,
      approxUsd: Math.round(approxUsd * 100) / 100,
      payments: payments.length,
      oneOffPayments,
      payers: payerIds.size,
    }
  }

  // Raw payments shared by the revenue summary and the billing payments feed.
  // Cached in redis because the vendor API is slow and rate limited; the
  // summaries are derived from this cache instead of being cached themselves.
  private async getCachedPaddlePayments(): Promise<{
    paid: PaddlePayment[]
    upcoming: PaddlePayment[]
    fetchedAt: string
  } | null> {
    const cached = await redis.get(REVENUE_CACHE_KEY).catch(() => null)

    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        // fall through to a fresh fetch
      }
    }

    if (!PADDLE_VENDOR_ID || !PADDLE_API_KEY) {
      return null
    }

    const toDateString = (date: Date) => date.toISOString().slice(0, 10)

    const now = new Date()
    const previousMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    )
    const upcomingUntil = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)

    let result

    try {
      const [paid, upcoming] = await Promise.all([
        this.fetchPaddlePayments(
          toDateString(previousMonthStart),
          toDateString(now),
          1,
        ),
        this.fetchPaddlePayments(
          toDateString(now),
          toDateString(upcomingUntil),
          0,
        ),
      ])

      result = { paid, upcoming, fetchedAt: now.toISOString() }
    } catch (error) {
      console.error('[ERROR] (admin getCachedPaddlePayments):', error)
      return null
    }

    await redis
      .set(
        REVENUE_CACHE_KEY,
        JSON.stringify(result),
        'EX',
        REVENUE_CACHE_TTL_SECONDS,
      )
      .catch(() => null)

    return result
  }

  // Real cash-in numbers from Paddle (includes one-off charges), unlike the
  // list-price MRR estimate
  async getRevenue() {
    const payments = await this.getCachedPaddlePayments()

    if (!payments) {
      return { available: false as const }
    }

    const now = new Date()
    const dayOfMonth = now.getUTCDate()
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    )
    const currentMonthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59),
    )

    const currentMonthPayments: PaddlePayment[] = []
    const previousMonthPayments: PaddlePayment[] = []
    const previousMonthToDatePayments: PaddlePayment[] = []

    for (const payment of payments.paid) {
      const payoutDate = new Date(payment.payout_date)

      if (payoutDate >= currentMonthStart) {
        currentMonthPayments.push(payment)
      } else {
        previousMonthPayments.push(payment)

        // Same day-of-month window as the current month, so the MoM badge
        // compares like for like instead of MTD vs a full month
        if (payoutDate.getUTCDate() <= dayOfMonth) {
          previousMonthToDatePayments.push(payment)
        }
      }
    }

    // "Scheduled" on the revenue card means the rest of this month only
    const upcomingThisMonth = payments.upcoming.filter(
      (payment) => new Date(payment.payout_date) <= currentMonthEnd,
    )

    return {
      available: true as const,
      currentMonth: this.summariseRevenue(currentMonthPayments),
      previousMonth: this.summariseRevenue(previousMonthPayments),
      previousMonthToDate: this.summariseRevenue(previousMonthToDatePayments),
      upcoming: this.summariseRevenue(upcomingThisMonth),
      fetchedAt: payments.fetchedAt,
    }
  }

  // -------------------- Billing health --------------------

  private formatBillingUser(user: User) {
    const revenue = this.getMonthlyRevenue(user)

    return {
      id: user.id,
      email: user.email,
      planCode: user.planCode,
      planType: getEffectivePlanType(user),
      billingFrequency: user.billingFrequency,
      created: user.created,
      trialEndDate: user.trialEndDate,
      nextBillDate: user.nextBillDate,
      cancellationEffectiveDate: user.cancellationEffectiveDate,
      dashboardBlockReason: user.dashboardBlockReason,
      isAccountBillingSuspended: user.isAccountBillingSuspended,
      // USD list-price estimate of what this account is worth per month
      monthlyRevenueUsd: revenue
        ? Math.round(revenue.usdAmount * 100) / 100
        : null,
    }
  }

  async getBilling() {
    const now = new Date()
    const in14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [trialUsers, cancellingUsers, suspendedUsers, payingUsers, paddle] =
      await Promise.all([
        // Recently-expired trials are as interesting as expiring ones - they
        // are the ones worth a personal follow-up email
        this.userRepository
          .createQueryBuilder('user')
          .loadRelationCountAndMap('user.projectCount', 'user.projects')
          .where('user.planCode = :trial', { trial: PlanCode.trial })
          .andWhere('user.trialEndDate IS NOT NULL')
          .andWhere('user.trialEndDate <= :in14d', { in14d })
          .andWhere('user.trialEndDate >= :monthAgo', { monthAgo })
          .orderBy('user.trialEndDate', 'ASC')
          .take(100)
          .getMany(),
        this.userRepository.find({
          where: { cancellationEffectiveDate: Not(IsNull()) },
          order: { cancellationEffectiveDate: 'ASC' },
          take: 100,
        }),
        this.userRepository
          .createQueryBuilder('user')
          .where(
            '(user.isAccountBillingSuspended = true OR user.dashboardBlockReason IS NOT NULL)',
          )
          .orderBy('user.created', 'DESC')
          .take(100)
          .getMany(),
        this.userRepository.find({
          where: { planCode: Not(In(FREE_PLAN_CODES)) },
        }),
        this.getCachedPaddlePayments(),
      ])

    const [trialUsage, churnRisk, payments] = await Promise.all([
      this.getMonthlyEventsForUsers(trialUsers.map((user) => user.id)),
      this.getChurnRisk(payingUsers),
      this.buildPaymentsFeed(paddle),
    ])

    return {
      trialsEndingSoon: trialUsers.map(
        (user: User & { projectCount?: number }) => ({
          ...this.formatBillingUser(user),
          projectCount: user.projectCount || 0,
          monthlyEvents: trialUsage[user.id] || 0,
        }),
      ),
      cancellationPipeline: cancellingUsers.map((user) =>
        this.formatBillingUser(user),
      ),
      suspended: suspendedUsers.map((user) => this.formatBillingUser(user)),
      churnRisk,
      payments,
    }
  }

  private async buildPaymentsFeed(
    paddle: {
      paid: PaddlePayment[]
      upcoming: PaddlePayment[]
      fetchedAt: string
    } | null,
  ) {
    if (!paddle) {
      return { available: false as const, recent: [], upcoming: [] }
    }

    const recent = [...paddle.paid]
      .sort(
        (a, b) =>
          new Date(b.payout_date).getTime() - new Date(a.payout_date).getTime(),
      )
      .slice(0, 50)
    const upcoming = [...paddle.upcoming]
      .sort(
        (a, b) =>
          new Date(a.payout_date).getTime() - new Date(b.payout_date).getTime(),
      )
      .slice(0, 50)

    // Paddle only knows subscription ids - map them back to accounts
    const subIds = Array.from(
      new Set(
        [...recent, ...upcoming].map(({ subscription_id }) =>
          String(subscription_id),
        ),
      ),
    )
    const users =
      subIds.length > 0
        ? await this.userRepository.find({
            where: { subID: In(subIds) },
            select: ['id', 'email', 'subID', 'planCode'],
          })
        : []
    const usersBySubId = Object.fromEntries(
      users.map((user) => [user.subID, user]),
    )

    const mapPayment = (payment: PaddlePayment) => {
      const user = usersBySubId[String(payment.subscription_id)]

      return {
        id: payment.id,
        date: payment.payout_date,
        amount: Number(payment.amount) || 0,
        currency: payment.currency,
        isOneOff: Boolean(payment.is_one_off_charge),
        receiptUrl: payment.receipt_url || null,
        subscriptionId: payment.subscription_id,
        user: user
          ? { id: user.id, email: user.email, planCode: user.planCode }
          : null,
      }
    }

    return {
      available: true as const,
      recent: recent.map(mapPayment),
      upcoming: upcoming.map(mapPayment),
      fetchedAt: paddle.fetchedAt,
    }
  }

  // Paying users whose usage collapsed vs the previous month - the churn
  // early-warning list
  private async getChurnRisk(payingUsers: User[]) {
    if (payingUsers.length === 0) {
      return { atRisk: [], analyzed: 0 }
    }

    const projects: { pid: string; userId: string }[] =
      await this.projectRepository
        .createQueryBuilder('project')
        .select('project.id', 'pid')
        .addSelect('admin.id', 'userId')
        .leftJoin('project.admin', 'admin')
        .where('admin.id IN (:...userIds)', {
          userIds: payingUsers.map((user) => user.id),
        })
        .getRawMany()

    if (projects.length === 0) {
      return { atRisk: [], analyzed: payingUsers.length }
    }

    const query = `
      SELECT
        pid,
        countIf(created >= now() - INTERVAL 30 DAY) AS current,
        countIf(
          created >= now() - INTERVAL 60 DAY
          AND created < now() - INTERVAL 30 DAY
        ) AS previous
      FROM events
      WHERE pid IN ({pids:Array(FixedString(12))})
        AND type IN ({types:Array(String)})
      GROUP BY pid
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pids: projects.map(({ pid }) => pid),
          types: ACTIVITY_EVENT_TYPES,
        },
      })
      .then((resultSet) =>
        resultSet.json<{ pid: string; current: number; previous: number }>(),
      )

    const byPid: Record<string, { current: number; previous: number }> = {}

    for (const { pid, current, previous } of data) {
      byPid[pid] = { current: Number(current), previous: Number(previous) }
    }

    const byUser: Record<string, { current: number; previous: number }> = {}

    for (const { pid, userId } of projects) {
      const counts = byPid[pid]

      if (!counts) {
        continue
      }

      byUser[userId] = byUser[userId] || { current: 0, previous: 0 }
      byUser[userId].current += counts.current
      byUser[userId].previous += counts.previous
    }

    const atRisk = payingUsers
      .map((user) => {
        const usage = byUser[user.id] || { current: 0, previous: 0 }
        const drop =
          usage.previous > 0
            ? (usage.previous - usage.current) / usage.previous
            : 0

        return { user, usage, drop }
      })
      .filter(
        ({ usage, drop }) =>
          usage.previous >= CHURN_RISK_MIN_PREV_EVENTS &&
          drop >= CHURN_RISK_MIN_DROP,
      )
      .sort((a, b) => b.drop - a.drop)
      .map(({ user, usage, drop }) => ({
        ...this.formatBillingUser(user),
        events30d: usage.current,
        eventsPrev30d: usage.previous,
        dropPercent: Math.round(drop * 100),
      }))

    return { atRisk, analyzed: payingUsers.length }
  }

  // -------------------- Bot blocks --------------------

  async getBotBlocks(days: number) {
    const [seriesRaw, byProjectRaw, totalsRaw] = await Promise.all([
      clickhouse
        .query({
          query: `
            SELECT toString(toDate(created)) AS date, reason, count() AS count
            FROM bot_blocks
            WHERE created >= now() - INTERVAL {days:UInt16} DAY
            GROUP BY date, reason
            ORDER BY date ASC
          `,
          query_params: { days },
        })
        .then((resultSet) =>
          resultSet.json<{ date: string; reason: string; count: number }>(),
        )
        .then(({ data }) => data),
      clickhouse
        .query({
          query: `
            SELECT pid, reason, count() AS count
            FROM bot_blocks
            WHERE created >= now() - INTERVAL {days:UInt16} DAY
            GROUP BY pid, reason
          `,
          query_params: { days },
        })
        .then((resultSet) =>
          resultSet.json<{ pid: string; reason: string; count: number }>(),
        )
        .then(({ data }) => data),
      clickhouse
        .query({
          query: `
            SELECT
              count() AS total,
              countIf(created >= now() - INTERVAL 1 DAY) AS last24h
            FROM bot_blocks
            WHERE created >= now() - INTERVAL {days:UInt16} DAY
          `,
          query_params: { days },
        })
        .then((resultSet) =>
          resultSet.json<{ total: number; last24h: number }>(),
        )
        .then(({ data }) => data[0]),
    ])

    // Aggregate per project and per reason
    const byPid: Record<
      string,
      { total: number; reasons: Record<string, number> }
    > = {}
    const byReason: Record<string, number> = {}

    for (const { pid, reason, count } of byProjectRaw) {
      const numeric = Number(count)

      byPid[pid] = byPid[pid] || { total: 0, reasons: {} }
      byPid[pid].total += numeric
      byPid[pid].reasons[reason] = (byPid[pid].reasons[reason] || 0) + numeric
      byReason[reason] = (byReason[reason] || 0) + numeric
    }

    const topPids = Object.entries(byPid)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 30)
      .map(([pid]) => pid)

    const [acceptedByPid, projects] = await Promise.all([
      this.getAcceptedEventCounts(topPids, days),
      topPids.length > 0
        ? this.projectRepository.find({
            where: { id: In(topPids) },
            relations: ['admin'],
          })
        : Promise.resolve([]),
    ])

    const projectsByPid: Record<string, Project> = {}

    for (const project of projects) {
      projectsByPid[project.id] = project
    }

    const topProjects = topPids.map((pid) => {
      const blocked = byPid[pid].total
      const accepted = acceptedByPid[pid] || 0
      const project = projectsByPid[pid]
      const topReason = Object.entries(byPid[pid].reasons).sort(
        ([, a], [, b]) => b - a,
      )[0]

      return {
        id: pid,
        name: project?.name || null,
        botsProtectionLevel: project?.botsProtectionLevel || null,
        admin: project?.admin
          ? { id: project.admin.id, email: project.admin.email }
          : null,
        blocked,
        accepted,
        // blocked / all incoming traffic; ~100% means the shield is eating
        // everything the customer sends
        blockRatio: Math.round((blocked / (blocked + accepted)) * 100),
        topReason: topReason ? topReason[0] : null,
      }
    })

    return {
      days,
      totals: {
        total: Number(totalsRaw?.total) || 0,
        last24h: Number(totalsRaw?.last24h) || 0,
      },
      byReason: Object.entries(byReason)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      series: seriesRaw.map(({ date, reason, count }) => ({
        date,
        reason,
        count: Number(count),
      })),
      topProjects,
    }
  }

  private async getAcceptedEventCounts(
    pids: string[],
    days: number,
  ): Promise<Record<string, number>> {
    if (pids.length === 0) {
      return {}
    }

    const { data } = await clickhouse
      .query({
        query: `
          SELECT pid, count() AS count
          FROM events
          WHERE pid IN ({pids:Array(FixedString(12))})
            AND created >= now() - INTERVAL {days:UInt16} DAY
            AND type IN ({types:Array(String)})
          GROUP BY pid
        `,
        query_params: { pids, days, types: ACTIVITY_EVENT_TYPES },
      })
      .then((resultSet) => resultSet.json<{ pid: string; count: number }>())

    return Object.fromEntries(
      data.map(({ pid, count }) => [pid, Number(count)]),
    )
  }

  // -------------------- Overview --------------------

  async getOverview() {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      activeUsers,
      paidUsers,
      trialUsers,
      cancellingUsers,
      suspendedUsers,
      totalProjects,
      liveProjects,
      totalOrganisations,
      planDistributionRaw,
      signups24h,
      signups7d,
      signups30d,
      signupsPrev30d,
      mrr,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({
        where: { planCode: Not(In(FREE_PLAN_CODES)) },
      }),
      this.userRepository.count({ where: { planCode: PlanCode.trial } }),
      this.userRepository.count({
        where: { cancellationEffectiveDate: Not(IsNull()) },
      }),
      this.userRepository.count({
        where: { isAccountBillingSuspended: true },
      }),
      this.projectRepository.count(),
      this.projectRepository.count({
        where: { active: true, isArchived: false },
      }),
      this.organisationRepository.count(),
      this.userRepository
        .createQueryBuilder('user')
        .select('user.planCode', 'planCode')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.planCode')
        .getRawMany<{ planCode: PlanCode; count: string }>(),
      this.countUsersCreatedSince(dayAgo),
      this.countUsersCreatedSince(weekAgo),
      this.countUsersCreatedSince(monthAgo),
      this.countUsersCreatedBetween(twoMonthsAgo, monthAgo),
      this.calculateMrr(),
    ])

    const eventStats = await this.getEventTotals()

    const planDistribution = planDistributionRaw
      .map(({ planCode, count }) => ({ planCode, count: Number(count) }))
      .sort((a, b) => b.count - a.count)

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        paid: paidUsers,
        trial: trialUsers,
        cancelling: cancellingUsers,
        suspended: suspendedUsers,
        signups24h,
        signups7d,
        signups30d,
        signupsPrev30d,
      },
      projects: {
        total: totalProjects,
        live: liveProjects,
      },
      organisations: {
        total: totalOrganisations,
      },
      events: eventStats,
      mrr,
      planDistribution,
    }
  }

  private async countUsersCreatedSince(since: Date): Promise<number> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.created >= :since', { since })
      .getCount()
  }

  private async countUsersCreatedBetween(
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.created >= :from AND user.created < :to', { from, to })
      .getCount()
  }

  private async getEventTotals() {
    const query = `
      SELECT
        count() AS total,
        countIf(created >= now() - INTERVAL 1 DAY) AS last24h,
        countIf(created >= now() - INTERVAL 7 DAY) AS last7d,
        countIf(created >= now() - INTERVAL 30 DAY) AS last30d,
        countIf(
          created >= now() - INTERVAL 60 DAY
          AND created < now() - INTERVAL 30 DAY
        ) AS prev30d
      FROM events
      WHERE type IN ({types:Array(String)})
    `

    const { data } = await clickhouse
      .query({ query, query_params: { types: ACTIVITY_EVENT_TYPES } })
      .then((resultSet) =>
        resultSet.json<{
          total: number
          last24h: number
          last7d: number
          last30d: number
          prev30d: number
        }>(),
      )

    return (
      data[0] || {
        total: 0,
        last24h: 0,
        last7d: 0,
        last30d: 0,
        prev30d: 0,
      }
    )
  }

  // -------------------- Charts --------------------

  async getCharts(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const prevSince = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000)

    const [
      signups,
      projects,
      organisations,
      events,
      signupsTotals,
      projectsTotals,
      organisationsTotals,
      eventsTotals,
      funnel,
    ] = await Promise.all([
      this.getMysqlCreationSeries('user', since),
      this.getMysqlCreationSeries('project', since),
      this.getMysqlCreationSeries('organisation', since),
      this.getEventsSeries(days),
      this.getMysqlCreationTotals('user', since, prevSince),
      this.getMysqlCreationTotals('project', since, prevSince),
      this.getMysqlCreationTotals('organisation', since, prevSince),
      this.getEventsTotalsForWindow(days),
      this.getActivationFunnel(since),
    ])

    return {
      signups,
      projects,
      organisations,
      events,
      // Current window vs the same-length window immediately before it, for
      // the change badges above the charts
      totals: {
        signups: signupsTotals,
        projects: projectsTotals,
        organisations: organisationsTotals,
        events: eventsTotals,
      },
      funnel,
    }
  }

  // Cohort funnel over users who signed up in the window: how far did they
  // get towards becoming paying customers (state as of now, not as of signup)
  private async getActivationFunnel(since: Date) {
    const cohort = await this.userRepository.find({
      where: { created: MoreThanOrEqual(since) },
      select: ['id', 'isActive', 'planCode'],
    })

    if (cohort.length === 0) {
      return {
        signups: 0,
        verified: 0,
        createdProject: 0,
        sentData: 0,
        paid: 0,
      }
    }

    const projects: { pid: string; userId: string }[] =
      await this.projectRepository
        .createQueryBuilder('project')
        .select('project.id', 'pid')
        .addSelect('admin.id', 'userId')
        .leftJoin('project.admin', 'admin')
        .where('admin.id IN (:...userIds)', {
          userIds: cohort.map((user) => user.id),
        })
        .getRawMany()

    const usersWithProject = new Set(projects.map(({ userId }) => userId))

    let usersWithData = new Set<string>()

    if (projects.length > 0) {
      const { data } = await clickhouse
        .query({
          query: `
            SELECT DISTINCT pid
            FROM events
            WHERE pid IN ({pids:Array(FixedString(12))})
              AND type IN ({types:Array(String)})
          `,
          query_params: {
            pids: projects.map(({ pid }) => pid),
            types: ACTIVITY_EVENT_TYPES,
          },
        })
        .then((resultSet) => resultSet.json<{ pid: string }>())

      const pidsWithData = new Set(data.map(({ pid }) => pid))

      usersWithData = new Set(
        projects
          .filter(({ pid }) => pidsWithData.has(pid))
          .map(({ userId }) => userId),
      )
    }

    return {
      signups: cohort.length,
      verified: cohort.filter((user) => user.isActive).length,
      createdProject: usersWithProject.size,
      sentData: usersWithData.size,
      paid: cohort.filter((user) => !FREE_PLAN_CODES.includes(user.planCode))
        .length,
    }
  }

  private async getMysqlCreationTotals(
    table: 'user' | 'project' | 'organisation',
    since: Date,
    prevSince: Date,
  ): Promise<{ current: number; previous: number }> {
    // table name comes from a hardcoded whitelist, never from user input
    const rows: { current: string; previous: string }[] =
      await this.userRepository.query(
        `
          SELECT
            COALESCE(SUM(created >= ?), 0) AS current,
            COALESCE(SUM(created < ?), 0) AS previous
          FROM \`${table}\`
          WHERE created >= ?
        `,
        [since, since, prevSince],
      )

    return {
      current: Number(rows[0]?.current) || 0,
      previous: Number(rows[0]?.previous) || 0,
    }
  }

  private async getEventsTotalsForWindow(
    days: number,
  ): Promise<{ current: number; previous: number }> {
    const query = `
      SELECT
        countIf(created >= now() - INTERVAL {days:UInt16} DAY) AS current,
        countIf(created < now() - INTERVAL {days:UInt16} DAY) AS previous
      FROM events
      WHERE created >= now() - INTERVAL {doubleDays:UInt16} DAY
        AND type IN ({types:Array(String)})
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          days,
          doubleDays: days * 2,
          types: ACTIVITY_EVENT_TYPES,
        },
      })
      .then((resultSet) =>
        resultSet.json<{ current: number; previous: number }>(),
      )

    return {
      current: Number(data[0]?.current) || 0,
      previous: Number(data[0]?.previous) || 0,
    }
  }

  private async getMysqlCreationSeries(
    table: 'user' | 'project' | 'organisation',
    since: Date,
  ): Promise<{ date: string; count: number }[]> {
    // table name comes from a hardcoded whitelist, never from user input
    const rows: { date: string; count: string }[] =
      await this.userRepository.query(
        `
          SELECT DATE_FORMAT(created, '%Y-%m-%d') AS date, COUNT(*) AS count
          FROM \`${table}\`
          WHERE created >= ?
          GROUP BY date
          ORDER BY date ASC
        `,
        [since],
      )

    return rows.map(({ date, count }) => ({ date, count: Number(count) }))
  }

  private async getEventsSeries(
    days: number,
  ): Promise<{ date: string; count: number }[]> {
    const query = `
      SELECT
        toString(toDate(created)) AS date,
        count() AS count
      FROM events
      WHERE created >= now() - INTERVAL {days:UInt16} DAY
        AND type IN ({types:Array(String)})
      GROUP BY date
      ORDER BY date ASC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { days, types: ACTIVITY_EVENT_TYPES },
      })
      .then((resultSet) => resultSet.json<{ date: string; count: number }>())

    return data.map(({ date, count }) => ({ date, count: Number(count) }))
  }

  // -------------------- Users --------------------

  async getUsers(
    page: number,
    search: string,
    filter: UsersFilter,
    sortBy: 'created' | 'email' | 'planCode',
    order: 'ASC' | 'DESC',
  ) {
    let query = this.userRepository
      .createQueryBuilder('user')
      .loadRelationCountAndMap('user.projectCount', 'user.projects')
      .orderBy(`user.${sortBy}`, order)
      .skip(page * USERS_PAGE_SIZE)
      .take(USERS_PAGE_SIZE)

    if (filter === 'active') {
      query = query.andWhere('user.isActive = true')
    } else if (filter === 'inactive') {
      query = query.andWhere('user.isActive = false')
    } else if (filter === 'paid') {
      query = query.andWhere('user.planCode NOT IN (:...freePlans)', {
        freePlans: FREE_PLAN_CODES,
      })
    } else if (filter === 'trial') {
      query = query.andWhere('user.planCode = :planCode', {
        planCode: PlanCode.trial,
      })
    } else if (filter === 'free') {
      query = query.andWhere('user.planCode IN (:...freePlans)', {
        freePlans: [PlanCode.free, PlanCode.none],
      })
    } else if (filter === 'cancelling') {
      query = query.andWhere('user.cancellationEffectiveDate IS NOT NULL')
    } else if (filter === 'suspended') {
      query = query.andWhere('user.isAccountBillingSuspended = true')
    } else if (filter === 'blocked') {
      query = query.andWhere(
        '(user.dashboardBlockReason IS NOT NULL OR user.isAccountBillingSuspended = true)',
      )
    }

    if (search) {
      query = query.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(user.id) LIKE :search OR LOWER(user.nickname) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      )
    }

    const [users, total] = await query.getManyAndCount()

    const monthlyEvents = await this.getMonthlyEventsForUsers(
      users.map((user) => user.id),
    )

    return {
      total,
      pageSize: USERS_PAGE_SIZE,
      users: users.map((user) => this.formatUserForList(user, monthlyEvents)),
    }
  }

  private formatUserForList(
    user: User & { projectCount?: number },
    monthlyEvents: Record<string, number>,
  ) {
    const limits = getEffectiveAccountLimits(user)

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      planCode: user.planCode,
      planType: getEffectivePlanType(user),
      billingFrequency: user.billingFrequency,
      tierCurrency: user.tierCurrency,
      isActive: user.isActive,
      created: user.created,
      trialEndDate: user.trialEndDate,
      nextBillDate: user.nextBillDate,
      cancellationEffectiveDate: user.cancellationEffectiveDate,
      dashboardBlockReason: user.dashboardBlockReason,
      isAccountBillingSuspended: user.isAccountBillingSuspended,
      addonOverrides: user.addonOverrides,
      entitlementOverrides: user.entitlementOverrides,
      // The raw column value (null = legacy), as opposed to the effective planType
      storedPlanType: user.planType,
      projectCount: user.projectCount || 0,
      maxProjects: limits.maxProjects,
      monthlyEvents: monthlyEvents[user.id] || 0,
      monthlyUsageLimit:
        ACCOUNT_PLANS[user.planCode]?.monthlyUsageLimit ?? null,
    }
  }

  // Billable events in the current calendar month, grouped by user
  private async getMonthlyEventsForUsers(
    userIds: string[],
  ): Promise<Record<string, number>> {
    if (userIds.length === 0) {
      return {}
    }

    const projects: { pid: string; userId: string }[] =
      await this.projectRepository
        .createQueryBuilder('project')
        .select('project.id', 'pid')
        .addSelect('admin.id', 'userId')
        .leftJoin('project.admin', 'admin')
        .where('admin.id IN (:...userIds)', { userIds })
        .getRawMany()

    if (projects.length === 0) {
      return {}
    }

    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)

    const query = `
      SELECT
        pid,
        ${BILLABLE_COUNT_IF} AS count
      FROM events
      WHERE pid IN ({pids:Array(FixedString(12))})
        AND type IN ('pageview', 'custom_event', 'error', 'captcha')
        AND created >= {from:String}
      GROUP BY pid
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pids: projects.map(({ pid }) => pid),
          from: dateToChDateTime(monthStart),
        },
      })
      .then((resultSet) => resultSet.json<{ pid: string; count: number }>())

    const countByPid: Record<string, number> = {}

    for (const { pid, count } of data) {
      countByPid[pid] = Number(count)
    }

    const countByUser: Record<string, number> = {}

    for (const { pid, userId } of projects) {
      countByUser[userId] = (countByUser[userId] || 0) + (countByPid[pid] || 0)
    }

    return countByUser
  }

  async getUserDetails(id: string) {
    const user = await this.userRepository.findOne({ where: { id } })

    if (!user) {
      throw new NotFoundException()
    }

    const [projects, memberships, monthlyEvents] = await Promise.all([
      this.projectRepository.find({
        where: { admin: { id } },
        relations: ['organisation'],
        order: { created: 'DESC' },
      }),
      this.organisationMemberRepository.find({
        where: { user: { id } },
        relations: ['organisation'],
      }),
      this.getMonthlyEventsForUsers([id]),
    ])

    const eventCounts = await this.getEventCountsForProjects(
      projects.map((project) => project.id),
    )

    return {
      user: this.formatUserForList(
        Object.assign(user, { projectCount: projects.length }),
        monthlyEvents,
      ),
      effectiveLimits: getEffectiveAccountLimits(user),
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        active: project.active,
        isArchived: project.isArchived,
        created: project.created,
        organisation: project.organisation
          ? { id: project.organisation.id, name: project.organisation.name }
          : null,
        ...(eventCounts[project.id] || {
          events24h: 0,
          events30d: 0,
          totalEvents: 0,
        }),
      })),
      memberships: memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        confirmed: membership.confirmed,
        created: membership.created,
        organisation: membership.organisation
          ? {
              id: membership.organisation.id,
              name: membership.organisation.name,
            }
          : null,
      })),
    }
  }

  async updateUser(
    id: string,
    updates: {
      planType?: PlanType | null
      addonOverrides?: Record<string, unknown> | null
      entitlementOverrides?: Record<string, unknown> | null
    },
  ) {
    const user = await this.userRepository.findOne({ where: { id } })

    if (!user) {
      throw new NotFoundException()
    }

    const update: Partial<User> = {}

    if ('planType' in updates) {
      update.planType = updates.planType
    }

    if ('addonOverrides' in updates) {
      update.addonOverrides = updates.addonOverrides
    }

    if ('entitlementOverrides' in updates) {
      update.entitlementOverrides = updates.entitlementOverrides
    }

    // Keep the legacy per-user limit columns in sync with the new effective
    // limits (parity with what the admin CLI used to do)
    const limits = getEffectiveAccountLimits({ ...user, ...update })

    if (typeof limits.maxProjects === 'number') {
      update.maxProjects = limits.maxProjects
    }

    if (typeof limits.maxApiKeyRequestsPerHour === 'number') {
      update.maxApiKeyRequestsPerHour = limits.maxApiKeyRequestsPerHour
    }

    await this.userRepository.update({ id }, update)

    return this.getUserDetails(id)
  }

  // -------------------- Projects --------------------

  async getProjects(
    page: number,
    search: string,
    filter: ProjectsFilter,
    sortBy: 'created' | 'name',
    order: 'ASC' | 'DESC',
  ) {
    let query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.admin', 'admin')
      .leftJoinAndSelect('project.organisation', 'organisation')
      .orderBy(`project.${sortBy}`, order)
      .skip(page * PROJECTS_PAGE_SIZE)
      .take(PROJECTS_PAGE_SIZE)

    if (filter === 'active') {
      query = query.andWhere(
        'project.active = true AND project.isArchived = false',
      )
    } else if (filter === 'archived') {
      query = query.andWhere('project.isArchived = true')
    } else if (filter.startsWith('inactive-')) {
      const days = Number(filter.split('-')[1])
      const activePids = await this.getProjectsWithRecentEvents(days)

      query = query.andWhere('project.isArchived = false')

      if (activePids.length > 0) {
        query = query.andWhere('project.id NOT IN (:...activePids)', {
          activePids,
        })
      }
    }

    if (search) {
      query = query.andWhere(
        '(LOWER(project.name) LIKE :search OR LOWER(project.id) LIKE :search OR LOWER(admin.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      )
    }

    const [projects, total] = await query.getManyAndCount()

    const eventCounts = await this.getEventCountsForProjects(
      projects.map((project) => project.id),
    )

    return {
      total,
      pageSize: PROJECTS_PAGE_SIZE,
      projects: projects.map((project) =>
        this.formatProject(project, eventCounts),
      ),
    }
  }

  private formatProject(
    project: Project,
    eventCounts: Record<
      string,
      { events24h: number; events30d: number; totalEvents: number }
    >,
  ) {
    return {
      id: project.id,
      name: project.name,
      active: project.active,
      public: project.public,
      isArchived: project.isArchived,
      isPasswordProtected: project.isPasswordProtected,
      botsProtectionLevel: project.botsProtectionLevel,
      created: project.created,
      admin: project.admin
        ? {
            id: project.admin.id,
            email: project.admin.email,
            planCode: project.admin.planCode,
          }
        : null,
      organisation: project.organisation
        ? { id: project.organisation.id, name: project.organisation.name }
        : null,
      ...(eventCounts[project.id] || {
        events24h: 0,
        events30d: 0,
        totalEvents: 0,
      }),
    }
  }

  private async getProjectsWithRecentEvents(days: number): Promise<string[]> {
    const query = `
      SELECT DISTINCT pid
      FROM events
      WHERE created >= now() - INTERVAL {days:UInt16} DAY
        AND type IN ({types:Array(String)})
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { days, types: ACTIVITY_EVENT_TYPES },
      })
      .then((resultSet) => resultSet.json<{ pid: string }>())

    return data.map(({ pid }) => pid)
  }

  private async getEventCountsForProjects(
    pids: string[],
  ): Promise<
    Record<
      string,
      { events24h: number; events30d: number; totalEvents: number }
    >
  > {
    if (pids.length === 0) {
      return {}
    }

    const query = `
      SELECT
        pid,
        countIf(created >= now() - INTERVAL 1 DAY) AS events24h,
        countIf(created >= now() - INTERVAL 30 DAY) AS events30d,
        count() AS totalEvents
      FROM events
      WHERE pid IN ({pids:Array(FixedString(12))})
        AND type IN ({types:Array(String)})
      GROUP BY pid
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pids, types: ACTIVITY_EVENT_TYPES },
      })
      .then((resultSet) =>
        resultSet.json<{
          pid: string
          events24h: number
          events30d: number
          totalEvents: number
        }>(),
      )

    const result: Record<
      string,
      { events24h: number; events30d: number; totalEvents: number }
    > = {}

    for (const { pid, events24h, events30d, totalEvents } of data) {
      result[pid] = {
        events24h: Number(events24h),
        events30d: Number(events30d),
        totalEvents: Number(totalEvents),
      }
    }

    return result
  }

  async getTopProjects(days: number, limit = 50) {
    const query = `
      SELECT
        pid,
        count() AS eventCount
      FROM events
      WHERE created >= now() - INTERVAL {days:UInt16} DAY
        AND type IN ({types:Array(String)})
      GROUP BY pid
      ORDER BY eventCount DESC
      LIMIT {limit:UInt16}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { days, limit, types: ACTIVITY_EVENT_TYPES },
      })
      .then((resultSet) =>
        resultSet.json<{ pid: string; eventCount: number }>(),
      )

    if (data.length === 0) {
      return { projects: [] }
    }

    const projects = await this.projectRepository.find({
      where: { id: In(data.map(({ pid }) => pid)) },
      relations: ['admin', 'organisation'],
    })

    const projectsByPid: Record<string, Project> = {}

    for (const project of projects) {
      projectsByPid[project.id] = project
    }

    return {
      projects: data.map(({ pid, eventCount }) => {
        const project = projectsByPid[pid]

        return {
          id: pid,
          eventCount: Number(eventCount),
          name: project?.name || null,
          created: project?.created || null,
          admin: project?.admin
            ? {
                id: project.admin.id,
                email: project.admin.email,
                planCode: project.admin.planCode,
              }
            : null,
          organisation: project?.organisation
            ? { id: project.organisation.id, name: project.organisation.name }
            : null,
        }
      }),
    }
  }

  async getProjectDetails(id: string) {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['admin', 'organisation', 'share', 'share.user'],
    })

    if (!project) {
      throw new NotFoundException()
    }

    const [eventCounts, series, typeBreakdown] = await Promise.all([
      this.getEventCountsForProjects([id]),
      this.getProjectEventsSeries(id, 30),
      this.getProjectEventTypeBreakdown(id),
    ])

    return {
      project: {
        ...this.formatProject(project, eventCounts),
        origins: project.origins,
        ipBlacklist: project.ipBlacklist,
      },
      series,
      typeBreakdown,
      shares: (project.share || []).map((share) => ({
        id: share.id,
        role: share.role,
        confirmed: share.confirmed,
        created: share.created,
        user: share.user
          ? { id: share.user.id, email: share.user.email }
          : null,
      })),
    }
  }

  private async getProjectEventsSeries(
    pid: string,
    days: number,
  ): Promise<{ date: string; count: number }[]> {
    const query = `
      SELECT
        toString(toDate(created)) AS date,
        count() AS count
      FROM events
      WHERE pid = {pid:FixedString(12)}
        AND created >= now() - INTERVAL {days:UInt16} DAY
        AND type IN ({types:Array(String)})
      GROUP BY date
      ORDER BY date ASC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pid, days, types: ACTIVITY_EVENT_TYPES },
      })
      .then((resultSet) => resultSet.json<{ date: string; count: number }>())

    return data.map(({ date, count }) => ({ date, count: Number(count) }))
  }

  private async getProjectEventTypeBreakdown(
    pid: string,
  ): Promise<{ type: string; last30d: number; total: number }[]> {
    const query = `
      SELECT
        type,
        countIf(created >= now() - INTERVAL 30 DAY) AS last30d,
        count() AS total
      FROM events
      WHERE pid = {pid:FixedString(12)}
        AND type IN ({types:Array(String)})
      GROUP BY type
      ORDER BY total DESC
    `

    const { data } = await clickhouse
      .query({ query, query_params: { pid, types: ACTIVITY_EVENT_TYPES } })
      .then((resultSet) =>
        resultSet.json<{ type: string; last30d: number; total: number }>(),
      )

    return data.map(({ type, last30d, total }) => ({
      type,
      last30d: Number(last30d),
      total: Number(total),
    }))
  }

  // -------------------- Organisations --------------------

  async getOrganisations(
    page: number,
    search: string,
    sortBy: 'created' | 'name',
    order: 'ASC' | 'DESC',
  ) {
    let query = this.organisationRepository
      .createQueryBuilder('org')
      .loadRelationCountAndMap('org.memberCount', 'org.members')
      .loadRelationCountAndMap('org.projectCount', 'org.projects')
      .orderBy(`org.${sortBy}`, order)
      .skip(page * ORGANISATIONS_PAGE_SIZE)
      .take(ORGANISATIONS_PAGE_SIZE)

    if (search) {
      query = query.where(
        '(LOWER(org.name) LIKE :search OR LOWER(org.id) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      )
    }

    const [organisations, total] = await query.getManyAndCount()

    const owners =
      organisations.length === 0
        ? []
        : await this.organisationMemberRepository.find({
            where: {
              organisation: { id: In(organisations.map((org) => org.id)) },
              role: OrganisationRole.owner,
            },
            relations: ['organisation', 'user'],
          })

    const ownersByOrgId: Record<string, OrganisationMember> = {}

    for (const owner of owners) {
      if (owner.organisation) {
        ownersByOrgId[owner.organisation.id] = owner
      }
    }

    return {
      total,
      pageSize: ORGANISATIONS_PAGE_SIZE,
      organisations: organisations.map(
        (
          org: Organisation & { memberCount?: number; projectCount?: number },
        ) => ({
          id: org.id,
          name: org.name,
          created: org.created,
          memberCount: org.memberCount || 0,
          projectCount: org.projectCount || 0,
          owner: ownersByOrgId[org.id]?.user
            ? {
                id: ownersByOrgId[org.id].user.id,
                email: ownersByOrgId[org.id].user.email,
              }
            : null,
        }),
      ),
    }
  }

  async getOrganisationDetails(id: string) {
    const organisation = await this.organisationRepository.findOne({
      where: { id },
      relations: ['members', 'members.user', 'projects', 'projects.admin'],
    })

    if (!organisation) {
      throw new NotFoundException()
    }

    const eventCounts = await this.getEventCountsForProjects(
      organisation.projects.map((project) => project.id),
    )

    return {
      organisation: {
        id: organisation.id,
        name: organisation.name,
        created: organisation.created,
        memberCount: organisation.members.length,
        projectCount: organisation.projects.length,
      },
      members: organisation.members.map((member) => ({
        id: member.id,
        role: member.role,
        confirmed: member.confirmed,
        created: member.created,
        user: member.user
          ? { id: member.user.id, email: member.user.email }
          : null,
      })),
      projects: organisation.projects.map((project) => ({
        id: project.id,
        name: project.name,
        active: project.active,
        isArchived: project.isArchived,
        created: project.created,
        admin: project.admin
          ? { id: project.admin.id, email: project.admin.email }
          : null,
        ...(eventCounts[project.id] || {
          events24h: 0,
          events30d: 0,
          totalEvents: 0,
        }),
      })),
    }
  }

  // -------------------- Feedback --------------------

  async getFeedback(
    type: FeedbackType,
    page: number,
    search: string,
    order: 'ASC' | 'DESC',
  ) {
    const [counts, list] = await Promise.all([
      this.getFeedbackCounts(),
      type === 'user'
        ? this.getUserFeedbackList(page, search, order)
        : type === 'cancellation'
          ? this.getCancellationFeedbackList(page, search, order)
          : this.getDeleteFeedbackList(page, search, order),
    ])

    return { ...list, counts }
  }

  private async getFeedbackCounts() {
    const [user, cancellation, deletion] = await Promise.all([
      this.userFeedbackRepository.count(),
      this.cancellationFeedbackRepository.count(),
      this.deleteFeedbackRepository.count(),
    ])

    return { user, cancellation, deletion }
  }

  private async getUsersByIds(
    ids: string[],
  ): Promise<Record<string, { id: string; email: string; planCode: string }>> {
    if (ids.length === 0) {
      return {}
    }

    const users = await this.userRepository.find({
      where: { id: In(ids) },
      select: ['id', 'email', 'planCode'],
    })

    return Object.fromEntries(
      users.map((user) => [
        user.id,
        { id: user.id, email: user.email, planCode: user.planCode },
      ]),
    )
  }

  private async getUserFeedbackList(
    page: number,
    search: string,
    order: 'ASC' | 'DESC',
  ) {
    let query = this.userFeedbackRepository
      .createQueryBuilder('fb')
      .orderBy('fb.createdAt', order)
      .skip(page * FEEDBACK_PAGE_SIZE)
      .take(FEEDBACK_PAGE_SIZE)

    if (search) {
      // Emails live on the user table, so resolve matching authors first to
      // make "who left it" searchable
      const matchingUsers: { id: string }[] = await this.userRepository
        .createQueryBuilder('user')
        .select('user.id', 'id')
        .where('LOWER(user.email) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        })
        .getRawMany()

      const ids = matchingUsers.map(({ id }) => id)

      query = query.andWhere(
        ids.length > 0
          ? '(LOWER(fb.message) LIKE :search OR fb.userId IN (:...ids))'
          : 'LOWER(fb.message) LIKE :search',
        { search: `%${search.toLowerCase()}%`, ids },
      )
    }

    const [items, total] = await query.getManyAndCount()

    const usersById = await this.getUsersByIds(
      Array.from(new Set(items.map((item) => item.userId))),
    )

    return {
      total,
      pageSize: FEEDBACK_PAGE_SIZE,
      items: items.map((item) => ({
        id: item.id,
        message: item.message,
        attachmentUrls: item.attachmentUrls || [],
        createdAt: item.createdAt,
        // null = the account was deleted since
        user: usersById[item.userId] || null,
        userId: item.userId,
      })),
    }
  }

  private async getCancellationFeedbackList(
    page: number,
    search: string,
    order: 'ASC' | 'DESC',
  ) {
    let query = this.cancellationFeedbackRepository
      .createQueryBuilder('fb')
      .orderBy('fb.createdAt', order)
      .skip(page * FEEDBACK_PAGE_SIZE)
      .take(FEEDBACK_PAGE_SIZE)

    if (search) {
      query = query.andWhere(
        '(LOWER(fb.feedback) LIKE :search OR LOWER(fb.email) LIKE :search OR LOWER(fb.planCode) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      )
    }

    const [items, total] = await query.getManyAndCount()

    // Link back to the account when it still exists
    const emails = Array.from(
      new Set(items.map((item) => item.email).filter(Boolean)),
    )
    const users =
      emails.length > 0
        ? await this.userRepository.find({
            where: { email: In(emails) },
            select: ['id', 'email', 'planCode'],
          })
        : []
    const usersByEmail = Object.fromEntries(
      users.map((user) => [user.email, user]),
    )

    return {
      total,
      pageSize: FEEDBACK_PAGE_SIZE,
      items: items.map((item) => ({
        id: item.id,
        message: item.feedback,
        email: item.email,
        planCode: item.planCode,
        createdAt: item.createdAt,
        user: item.email
          ? usersByEmail[item.email]
            ? {
                id: usersByEmail[item.email].id,
                email: usersByEmail[item.email].email,
                planCode: usersByEmail[item.email].planCode,
              }
            : null
          : null,
      })),
    }
  }

  private async getDeleteFeedbackList(
    page: number,
    search: string,
    order: 'ASC' | 'DESC',
  ) {
    let query = this.deleteFeedbackRepository
      .createQueryBuilder('fb')
      .orderBy('fb.createdAt', order)
      .skip(page * FEEDBACK_PAGE_SIZE)
      .take(FEEDBACK_PAGE_SIZE)

    if (search) {
      query = query.andWhere('LOWER(fb.feedback) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      })
    }

    const [items, total] = await query.getManyAndCount()

    return {
      total,
      pageSize: FEEDBACK_PAGE_SIZE,
      items: items.map((item) => ({
        id: item.id,
        message: item.feedback,
        createdAt: item.createdAt,
      })),
    }
  }

  // -------------------- Database --------------------

  async getDatabaseInfo() {
    const [clickhouseInfo, mysqlInfo] = await Promise.all([
      this.getClickhouseInfo(),
      this.getMysqlInfo(),
    ])

    return { clickhouse: clickhouseInfo, mysql: mysqlInfo }
  }

  private async getClickhouseInfo() {
    const disksQuery = `
      SELECT
        name,
        path,
        free_space AS freeSpace,
        total_space AS totalSpace
      FROM system.disks
    `

    const tablesQuery = `
      SELECT
        table,
        sum(rows) AS rows,
        sum(data_compressed_bytes) AS compressedBytes,
        sum(data_uncompressed_bytes) AS uncompressedBytes,
        count() AS parts
      FROM system.parts
      WHERE database = currentDatabase() AND active
      GROUP BY table
      ORDER BY compressedBytes DESC
    `

    const [disks, tables, version] = await Promise.all([
      clickhouse
        .query({ query: disksQuery })
        .then((resultSet) =>
          resultSet.json<{
            name: string
            path: string
            freeSpace: number
            totalSpace: number
          }>(),
        )
        .then(({ data }) =>
          data.map((disk) => ({
            ...disk,
            freeSpace: Number(disk.freeSpace),
            totalSpace: Number(disk.totalSpace),
          })),
        ),
      clickhouse
        .query({ query: tablesQuery })
        .then((resultSet) =>
          resultSet.json<{
            table: string
            rows: number
            compressedBytes: number
            uncompressedBytes: number
            parts: number
          }>(),
        )
        .then(({ data }) =>
          data.map((table) => ({
            ...table,
            rows: Number(table.rows),
            compressedBytes: Number(table.compressedBytes),
            uncompressedBytes: Number(table.uncompressedBytes),
            parts: Number(table.parts),
          })),
        ),
      clickhouse
        .query({ query: 'SELECT version() AS version' })
        .then((resultSet) => resultSet.json<{ version: string }>())
        .then(({ data }) => data[0]?.version || null),
    ])

    return {
      version,
      disks,
      tables,
      totalCompressedBytes: tables.reduce(
        (acc, table) => acc + table.compressedBytes,
        0,
      ),
      totalUncompressedBytes: tables.reduce(
        (acc, table) => acc + table.uncompressedBytes,
        0,
      ),
      totalRows: tables.reduce((acc, table) => acc + table.rows, 0),
    }
  }

  private async getMysqlInfo() {
    const [tables, versionRow] = await Promise.all([
      this.userRepository.query(
        `
          SELECT
            table_name AS tableName,
            table_rows AS estimatedRows,
            data_length AS dataBytes,
            index_length AS indexBytes
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          ORDER BY data_length + index_length DESC
        `,
      ) as Promise<
        {
          tableName: string
          estimatedRows: string
          dataBytes: string
          indexBytes: string
        }[]
      >,
      this.userRepository.query('SELECT VERSION() AS version') as Promise<
        { version: string }[]
      >,
    ])

    const formattedTables = tables.map((table) => ({
      tableName: table.tableName,
      estimatedRows: Number(table.estimatedRows),
      dataBytes: Number(table.dataBytes),
      indexBytes: Number(table.indexBytes),
    }))

    return {
      version: versionRow[0]?.version || null,
      tables: formattedTables,
      totalBytes: formattedTables.reduce(
        (acc, table) => acc + table.dataBytes + table.indexBytes,
        0,
      ),
    }
  }
}
