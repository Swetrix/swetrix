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
}
