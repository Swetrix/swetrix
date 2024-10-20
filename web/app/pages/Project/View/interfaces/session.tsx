export interface ISession {
  psid: string
  cc: string | null
  os: string | null
  br: string | null
  pageviews: number
  created: string
  active: 1 | 0
}

export interface ISessionDetails {
  cc: string | null
  os: string | null
  osv: string | null
  br: string | null
  brv: string | null
  lc: string | null
  ref: string | null
  so: string | null
  me: string | null
  ca: string | null
  te: string | null
  co: string | null
  rg: string | null
  ct: string | null
  dv: string | null
  sdur: number | null
}
