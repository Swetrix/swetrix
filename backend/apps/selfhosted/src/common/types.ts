export interface ClickhouseSFUser {
  id: string
  timezone: string | null
  timeFormat: string | null
  showLiveVisitorsInTitle: number | null
}

export interface ClickhouseProject {
  id: string
  name: string
  origins: string | null
  ipBlacklist: string | null
  active: number
  public: number
  isPasswordProtected: number
  passwordHash: string | null
  created: string
}

export interface ClickhouseFunnel {
  id: string
  name: string
  steps: string
  projectId: string
  created: string
}
