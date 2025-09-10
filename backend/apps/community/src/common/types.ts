import { OnboardingStep } from '../user/entities/user.entity'

export interface ClickhouseUser {
  id: string
  email: string
  password: string
  timezone: string
  timeFormat: string
  showLiveVisitorsInTitle: number
  onboardingStep: OnboardingStep
  hasCompletedOnboarding: number
  apiKey: string | null
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
