export enum BotsProtectionLevel {
  OFF = 'off',
  BASIC = 'basic',
}

export enum SaltRotation {
  DAILY = 'daily', // Default - current behavior, for DAU tracking
  WEEKLY = 'weekly', // For WAU (Weekly Active Users) tracking
  MONTHLY = 'monthly', // For MAU (Monthly Active Users) tracking
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
  saltRotation: SaltRotation
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
