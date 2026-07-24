export type AdminTab =
  | 'overview'
  | 'billing'
  | 'users'
  | 'projects'
  | 'organisations'
  | 'feedback'
  | 'bot-blocks'
  | 'database'

export interface AdminBillingUser {
  id: string
  email: string
  planCode: string
  planType: string | null
  billingFrequency: string | null
  created: string
  trialEndDate: string | null
  nextBillDate: string | null
  cancellationEffectiveDate: string | null
  dashboardBlockReason: string | null
  isAccountBillingSuspended: boolean
  monthlyRevenueUsd: number | null
}

export interface AdminPayment {
  id: number
  date: string
  amount: number
  currency: string
  isOneOff: boolean
  receiptUrl: string | null
  subscriptionId: number
  user: { id: string; email: string; planCode: string } | null
}

export interface AdminBilling {
  trialsEndingSoon: (AdminBillingUser & {
    projectCount: number
    monthlyEvents: number
  })[]
  cancellationPipeline: AdminBillingUser[]
  suspended: AdminBillingUser[]
  churnRisk: {
    atRisk: (AdminBillingUser & {
      events30d: number
      eventsPrev30d: number
      dropPercent: number
    })[]
    analyzed: number
  }
  payments: {
    available: boolean
    recent: AdminPayment[]
    upcoming: AdminPayment[]
    fetchedAt?: string
  }
}

export interface AdminBotBlocks {
  days: number
  totals: { total: number; last24h: number }
  byReason: { reason: string; count: number }[]
  series: { date: string; reason: string; count: number }[]
  topProjects: {
    id: string
    name: string | null
    botsProtectionLevel: string | null
    admin: { id: string; email: string } | null
    blocked: number
    accepted: number
    blockRatio: number
    topReason: string | null
  }[]
}

interface AdminActivationFunnel {
  signups: number
  verified: number
  createdProject: number
  sentData: number
  paid: number
}

export type AdminFeedbackType = 'user' | 'cancellation' | 'deletion'

export interface AdminFeedbackItem {
  id: string
  message: string | null
  createdAt: string
  attachmentUrls?: string[]
  email?: string | null
  planCode?: string | null
  userId?: string
  user?: { id: string; email: string; planCode: string } | null
}

export interface AdminFeedbackList {
  total: number
  pageSize: number
  items: AdminFeedbackItem[]
  counts: { user: number; cancellation: number; deletion: number }
}

export interface SeriesPoint {
  date: string
  count: number
}

export interface AdminOverview {
  users: {
    total: number
    active: number
    paid: number
    trial: number
    cancelling: number
    suspended: number
    signups24h: number
    signups7d: number
    signups30d: number
    signupsPrev30d: number
  }
  projects: {
    total: number
    live: number
  }
  organisations: {
    total: number
  }
  events: {
    total: number
    last24h: number
    last7d: number
    last30d: number
    prev30d: number
  }
  mrr: {
    byCurrency: { USD: number; EUR: number; GBP: number }
    usdEquivalent: number
    payingUsers: number
    unpricedSubscriptions: number
  }
  planDistribution: { planCode: string; count: number }[]
}

interface RevenueBucket {
  byCurrency: Record<string, number>
  approxUsd: number
  payments: number
  oneOffPayments: number
  payers: number
}

export interface AdminRevenue {
  available: boolean
  currentMonth?: RevenueBucket
  previousMonth?: RevenueBucket
  previousMonthToDate?: RevenueBucket
  upcoming?: RevenueBucket
  fetchedAt?: string
}

interface WindowTotals {
  current: number
  previous: number
}

export interface AdminCharts {
  signups: SeriesPoint[]
  projects: SeriesPoint[]
  organisations: SeriesPoint[]
  events: SeriesPoint[]
  totals: {
    signups: WindowTotals
    projects: WindowTotals
    organisations: WindowTotals
    events: WindowTotals
  }
  funnel: AdminActivationFunnel
}

export interface SortState {
  by: string
  order: 'ASC' | 'DESC'
}

export interface AdminUser {
  id: string
  email: string
  nickname: string | null
  planCode: string
  planType: string | null
  billingFrequency: string | null
  tierCurrency: string | null
  isActive: boolean
  created: string
  trialEndDate: string | null
  nextBillDate: string | null
  cancellationEffectiveDate: string | null
  dashboardBlockReason: string | null
  isAccountBillingSuspended: boolean
  addonOverrides: Record<string, unknown> | null
  entitlementOverrides: Record<string, unknown> | null
  storedPlanType: string | null
  projectCount: number
  maxProjects: number | 'custom'
  monthlyEvents: number
  monthlyUsageLimit: number | null
}

export interface AdminUsersList {
  total: number
  pageSize: number
  users: AdminUser[]
}

interface AdminUserProject {
  id: string
  name: string
  active: boolean
  isArchived: boolean
  created: string
  organisation: { id: string; name: string } | null
  events24h: number
  events30d: number
  totalEvents: number
}

export interface AdminUserDetails {
  user: AdminUser
  effectiveLimits: Record<string, unknown>
  projects: AdminUserProject[]
  memberships: {
    id: string
    role: string
    confirmed: boolean
    created: string
    organisation: { id: string; name: string } | null
  }[]
}

export interface AdminProject {
  id: string
  name: string
  active: boolean
  public: boolean
  isArchived: boolean
  isPasswordProtected: boolean
  botsProtectionLevel: string
  created: string
  admin: { id: string; email: string; planCode: string } | null
  organisation: { id: string; name: string } | null
  events24h: number
  events30d: number
  totalEvents: number
}

export interface AdminProjectsList {
  total: number
  pageSize: number
  projects: AdminProject[]
}

interface AdminTopProject {
  id: string
  eventCount: number
  name: string | null
  created: string | null
  admin: { id: string; email: string; planCode: string } | null
  organisation: { id: string; name: string } | null
}

export interface AdminTopProjects {
  projects: AdminTopProject[]
}

export interface AdminProjectDetails {
  project: AdminProject & {
    origins: string[] | null
    ipBlacklist: string[] | null
  }
  series: SeriesPoint[]
  typeBreakdown: { type: string; last30d: number; total: number }[]
  shares: {
    id: string
    role: string
    confirmed: boolean
    created: string
    user: { id: string; email: string } | null
  }[]
}

export interface AdminOrganisationDetails {
  organisation: {
    id: string
    name: string
    created: string
    memberCount: number
    projectCount: number
  }
  members: {
    id: string
    role: string
    confirmed: boolean
    created: string
    user: { id: string; email: string } | null
  }[]
  projects: {
    id: string
    name: string
    active: boolean
    isArchived: boolean
    created: string
    admin: { id: string; email: string } | null
    events24h: number
    events30d: number
    totalEvents: number
  }[]
}

interface AdminOrganisation {
  id: string
  name: string
  created: string
  memberCount: number
  projectCount: number
  owner: { id: string; email: string } | null
}

export interface AdminOrganisationsList {
  total: number
  pageSize: number
  organisations: AdminOrganisation[]
}

export interface AdminDatabaseInfo {
  clickhouse: {
    version: string | null
    disks: {
      name: string
      path: string
      freeSpace: number
      totalSpace: number
    }[]
    tables: {
      table: string
      rows: number
      compressedBytes: number
      uncompressedBytes: number
      parts: number
    }[]
    totalCompressedBytes: number
    totalUncompressedBytes: number
    totalRows: number
  }
  mysql: {
    version: string | null
    tables: {
      tableName: string
      estimatedRows: number
      dataBytes: number
      indexBytes: number
    }[]
    totalBytes: number
  }
}

export interface AdminActionData {
  success?: boolean
  error?: string
}

export interface AdminLoaderData {
  tab: AdminTab
  overview?: AdminOverview
  charts?: AdminCharts
  chartDays?: number
  revenue?: AdminRevenue | null
  users?: AdminUsersList
  userDetails?: AdminUserDetails | null
  projects?: AdminProjectsList
  topProjects?: AdminTopProjects
  projectDetails?: AdminProjectDetails | null
  organisations?: AdminOrganisationsList
  organisationDetails?: AdminOrganisationDetails | null
  feedback?: AdminFeedbackList
  billing?: AdminBilling
  botBlocks?: AdminBotBlocks
  database?: AdminDatabaseInfo
}
