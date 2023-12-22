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
  br: string | null
  lc: string | null
  ref: string | null
  so: string | null
  me: string | null
  ca: string | null
  rg: string | null
  ct: string | null
  dv: string | null
  sdur: number | null
}
