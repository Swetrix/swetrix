export type NotificationChannelType =
  | 'email'
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'webhook'
  | 'webpush'

export type NotificationChannelScope = 'user' | 'organisation' | 'project'

export interface NotificationChannel {
  id: string
  name: string
  type: NotificationChannelType
  config: Record<string, any>
  isVerified: boolean
  scope: NotificationChannelScope
  userId?: string | null
  organisationId?: string | null
  projectId?: string | null
  created: string
  updated: string
}
