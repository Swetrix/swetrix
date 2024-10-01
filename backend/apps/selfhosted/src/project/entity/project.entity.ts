export class Project {
  id: string

  name: string

  origins: string[]

  ipBlacklist: string[]

  active: boolean

  public: boolean

  isPasswordProtected: boolean

  passwordHash?: string

  created: Date
}
