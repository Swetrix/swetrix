export interface Session {
  psid: string
  cc: string | null
  os: string | null
  br: string | null
  pageviews: number
  created: string
  isLive: 1 | 0
  sdur?: number

  sessionStart: string
  lastActivity: string
}

export interface SessionDetails {
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

  sdur?: number
  isLive?: boolean
}
