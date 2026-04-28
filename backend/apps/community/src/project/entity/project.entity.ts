export enum BotsProtectionLevel {
  OFF = 'off',
  BASIC = 'basic',
  STRICT = 'strict',
}

export class Project {
  id: string
  name: string
  origins: string[]
  ipBlacklist: string[]
  countryBlacklist: string[]
  active: boolean
  public: boolean
  isPasswordProtected: boolean
  botsProtectionLevel: BotsProtectionLevel
  passwordHash?: string
  created: Date
  adminId: string | null
  // Optional website URL - used to display favicon and construct page links
  websiteUrl: string | null
  // CAPTCHA fields
  isCaptchaProject: boolean
  captchaSecretKey?: string
  captchaDifficulty?: number
  // Google Search Console integration fields
  gscPropertyUri?: string | null
  gscAccessTokenEnc?: string | null
  gscRefreshTokenEnc?: string | null
  gscTokenExpiry?: string | number | null
  gscScope?: string | null
  gscAccountEmail?: string | null
  // SEO branded traffic classification keywords
  brandKeywords?: string | string[] | null
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
