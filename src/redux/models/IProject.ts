export interface IOverall {
    thisWeek: number
    lastWeek: number
    thisWeekUnique: number
    lastWeekUnique: number
}

export interface IUserShareProject {
    email: string
}

export interface IShareOwnerProject {
    id: string
    confirmed: boolean
    role: string
    created: string
    updated: string
    user: IUserShareProject
}

export interface IProject {
    id: string
    name: string
    origins: string[]
    ipBlacklist: string[] | null
    active: boolean
    public: boolean
    isAnalyticsProject: boolean
    isCaptchaProject: boolean
    isCaptchaEnabled: boolean
    captchaSecretKey: string | null
    created: string
    share: IShareOwnerProject[]
    isOwner: boolean
    overall: IOverall
    live: number
}
