export type AdminTab =
  | 'overview'
  | 'users'
  | 'projects'
  | 'organisations'
  | 'database'

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
  }
  mrr: {
    byCurrency: { USD: number; EUR: number; GBP: number }
    usdEquivalent: number
    payingUsers: number
    unpricedSubscriptions: number
  }
  planDistribution: { planCode: string; count: number }[]
}

export interface AdminCharts {
  signups: SeriesPoint[]
  projects: SeriesPoint[]
  organisations: SeriesPoint[]
  events: SeriesPoint[]
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
  users?: AdminUsersList
  userDetails?: AdminUserDetails | null
  projects?: AdminProjectsList
  topProjects?: AdminTopProjects
  organisations?: AdminOrganisationsList
  database?: AdminDatabaseInfo
}
