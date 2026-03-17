export interface BillingInvoice {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'refunded' | 'pending'
  planCode: string | null
  billingFrequency: string | null
  receiptUrl: string | null
  billedAt: string
}
