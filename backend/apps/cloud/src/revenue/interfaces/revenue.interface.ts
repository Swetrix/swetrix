export enum RevenueProvider {
  PADDLE = 'paddle',
  STRIPE = 'stripe',
}

export enum RevenueType {
  SALE = 'sale',
  REFUND = 'refund',
  SUBSCRIPTION = 'subscription',
}

export enum RevenueStatus {
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  PENDING = 'pending',
}

export interface RevenueTransaction {
  pid: string
  transactionId: string
  provider: RevenueProvider
  type: RevenueType
  status: RevenueStatus
  amount: number
  originalAmount: number
  originalCurrency: string
  currency: string
  profileId?: string | null
  sessionId?: string | null
  customerEmail?: string | null
  productId?: string | null
  productName?: string | null
  metadata?: Record<string, unknown>
  created: Date
  syncedAt: Date
}

export interface RevenueStats {
  totalRevenue: number
  salesCount: number
  refundsCount: number
  refundsAmount: number
  averageOrderValue: number
  currency: string
}

export interface RevenueChartData {
  x: string[]
  revenue: number[]
  salesCount: number[]
  refundsAmount: number[]
}

export interface RevenueBreakdown {
  bySource: { name: string; revenue: number; count: number }[]
  byCountry: { name: string; revenue: number; count: number }[]
  byProduct: { name: string; revenue: number; count: number }[]
}

export interface PaddleApiKey {
  permissions: string[]
  createdAt: Date
}

export const PADDLE_REQUIRED_PERMISSIONS = [
  'transaction.read',
  'subscription.read',
  'customer.read',
  'product.read',
  'price.read',
]

// TODO: Change to vendors.paddle.com when merging to main
export const PADDLE_API_KEY_CREATE_URL = `https://sandbox-vendors.paddle.com/authentication-v2`
