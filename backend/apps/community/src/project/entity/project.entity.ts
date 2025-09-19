export enum BotsProtectionLevel {
  OFF = 'off',
  BASIC = 'basic',
}

export class Project {
  id: string
  name: string
  origins: string[]
  ipBlacklist: string[]
  active: boolean
  public: boolean
  isPasswordProtected: boolean
  botsProtectionLevel: BotsProtectionLevel
  passwordHash?: string
  created: Date
  adminId: string | null
}

export enum Role {
  viewer = 'viewer',
  admin = 'admin',
}

export class ProjectWithShare extends Project {
  share: {
    id: string
    role: Role
    confirmed: boolean
    user: {
      id: string
      email: string
    }
  }[]
}
