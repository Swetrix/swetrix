import { OnboardingStep } from '../user/entities/user.entity'

export interface ClickhouseInputUser {
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

export interface User {
  id: string
  email: string
  password: string
  timezone: string
  timeFormat: string
  showLiveVisitorsInTitle: boolean
  onboardingStep: OnboardingStep
  hasCompletedOnboarding: boolean
  apiKey: string | null
}

export interface ClickhouseFunnel {
  id: string
  name: string
  steps: string
  projectId: string
  created: string
}

export interface ClickhouseAnnotation {
  id: string
  date: string
  text: string
  projectId: string
  created: string
}
