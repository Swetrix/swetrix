export interface IOvervallObject {
    thisWeek?: number
    lastWeek?: number
    thisWeekUnique?: number
    lastWeekUnique?: number
    percChange?: number
    total?: number
    percChangeUnique?: number
}

export interface IOverall {
    [key: string]: IOvervallObject
}

export interface IUserShareProject {
    email: string
}

export interface ILiveStats {
    [key: string]: number
}

export interface IShareOwnerProject {
    id: string
    confirmed: boolean
    role: string
    created: string
    updated: string
    user: IUserShareProject
}

export interface IProjectNames {
    name: string
    id: string
    isCaptchaProject: boolean
}

export interface IProject {
    id: string
    name: string
    origins: string[] | string | null
    ipBlacklist: string[] | null | string
    active: boolean
    public: boolean
    isAnalyticsProject: boolean
    isCaptchaProject: boolean
    isCaptchaEnabled: boolean
    captchaSecretKey: string | null
    created: string
    share?: IShareOwnerProject[]
    isOwner: boolean
    overall: IOvervallObject
    uiHidden: boolean
    isPublic?: boolean
    isTransferring?: boolean
    isPasswordProtected?: boolean
    password?: string
}

export interface ICaptchaProject {
    id: string
    name: string
    origins: string[] | string | null
    ipBlacklist: string[] | null | string
    active: boolean
    public: boolean
    isAnalyticsProject: boolean
    isCaptchaProject: boolean
    isCaptchaEnabled: boolean
    captchaSecretKey: string | null
    created: string
    isOwner: boolean
    overall: IOvervallObject
    uiHidden: boolean
}
