import { ApiProperty } from '@nestjs/swagger'

export class RevenueStatsDto {
  @ApiProperty({ description: 'Total revenue in the period' })
  totalRevenue: number

  @ApiProperty({ description: 'Number of sales' })
  salesCount: number

  @ApiProperty({ description: 'Number of refunds' })
  refundsCount: number

  @ApiProperty({ description: 'Total refund amount' })
  refundsAmount: number

  @ApiProperty({ description: 'Average order value' })
  averageOrderValue: number

  @ApiProperty({ description: 'Currency code' })
  currency: string

  @ApiProperty({ description: 'Monthly Recurring Revenue (estimated)' })
  mrr: number

  @ApiProperty({ description: 'Percentage change from previous period' })
  revenueChange: number
}

export class RevenueChartDto {
  @ApiProperty({ description: 'X-axis labels (dates)' })
  x: string[]

  @ApiProperty({ description: 'Revenue values' })
  revenue: number[]

  @ApiProperty({ description: 'Sales count values' })
  salesCount: number[]

  @ApiProperty({ description: 'Refunds amount values' })
  refundsAmount: number[]
}

export class RevenueTransactionDto {
  @ApiProperty({ description: 'Transaction ID from payment provider' })
  transactionId: string

  @ApiProperty({ description: 'Payment provider (paddle, stripe)' })
  provider: string

  @ApiProperty({ description: 'Transaction type (sale, refund, subscription)' })
  type: string

  @ApiProperty({ description: 'Transaction status' })
  status: string

  @ApiProperty({ description: 'Amount in project currency' })
  amount: number

  @ApiProperty({ description: 'Currency code' })
  currency: string

  @ApiProperty({ description: 'Original amount before conversion' })
  originalAmount: number

  @ApiProperty({ description: 'Original currency' })
  originalCurrency: string

  @ApiProperty({
    description: 'Customer email (if available)',
    required: false,
  })
  customerEmail?: string

  @ApiProperty({ description: 'Product name (if available)', required: false })
  productName?: string

  @ApiProperty({ description: 'Profile ID for attribution', required: false })
  profileId?: string

  @ApiProperty({ description: 'Session ID for attribution', required: false })
  sessionId?: string

  @ApiProperty({ description: 'Transaction date' })
  created: string
}

export class RevenueBreakdownItemDto {
  @ApiProperty({ description: 'Breakdown category name' })
  name: string

  @ApiProperty({ description: 'Total revenue' })
  revenue: number

  @ApiProperty({ description: 'Number of transactions' })
  count: number
}

export class RevenueBreakdownDto {
  @ApiProperty({
    description: 'Revenue by source/referrer',
    type: [RevenueBreakdownItemDto],
  })
  bySource: RevenueBreakdownItemDto[]

  @ApiProperty({
    description: 'Revenue by country',
    type: [RevenueBreakdownItemDto],
  })
  byCountry: RevenueBreakdownItemDto[]

  @ApiProperty({
    description: 'Revenue by product',
    type: [RevenueBreakdownItemDto],
  })
  byProduct: RevenueBreakdownItemDto[]
}

export class RevenueStatusDto {
  @ApiProperty({ description: 'Whether Paddle is connected' })
  connected: boolean

  @ApiProperty({ description: 'Payment provider name', required: false })
  provider?: string

  @ApiProperty({
    description: 'Currency for revenue reporting',
    required: false,
  })
  currency?: string

  @ApiProperty({ description: 'Last sync timestamp', required: false })
  lastSyncAt?: string
}
