export interface SwetrixError {
  eid: string
  name: string
  message: string
  filename: string
  count: number
  last_seen: string
  status: 'active' | 'regressed' | 'fixed'
}

export interface SwetrixErrorDetails extends SwetrixError {
  colno: number
  lineno: number
  first_seen: string
}
