import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Not, Repository } from 'typeorm'

import { clickhouse } from '../common/integrations/clickhouse'
import { Organisation } from '../organisation/entity/organisation.entity'
import {
  OrganisationMember,
  OrganisationRole,
} from '../organisation/entity/organisation-member.entity'
import { Project } from '../project/entity/project.entity'
import {
  ACCOUNT_PLANS,
  BillingFrequency,
  getEffectiveAccountLimits,
  getEffectivePlanType,
  PlanCode,
  PlanType,
  User,
} from '../user/entities/user.entity'

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

  // -------------------- Overview --------------------

  async getOverview() {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

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

  private async getEventTotals() {
    const query = `
      SELECT
        count() AS total,
        countIf(created >= now() - INTERVAL 1 DAY) AS last24h,
        countIf(created >= now() - INTERVAL 7 DAY) AS last7d,
        countIf(created >= now() - INTERVAL 30 DAY) AS last30d
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
        }>(),
      )

    return (
      data[0] || {
        total: 0,
        last24h: 0,
        last7d: 0,
        last30d: 0,
      }
    )
  }

  // -------------------- Charts --------------------

  async getCharts(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [signups, projects, organisations, events] = await Promise.all([
      this.getMysqlCreationSeries('user', since),
      this.getMysqlCreationSeries('project', since),
      this.getMysqlCreationSeries('organisation', since),
      this.getEventsSeries(days),
    ])

    return { signups, projects, organisations, events }
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

  // -------------------- Organisations --------------------

  async getOrganisations(page: number, search: string) {
    let query = this.organisationRepository
      .createQueryBuilder('org')
      .loadRelationCountAndMap('org.memberCount', 'org.members')
      .loadRelationCountAndMap('org.projectCount', 'org.projects')
      .orderBy('org.created', 'DESC')
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
