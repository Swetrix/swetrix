import {
  BellRingingIcon,
  EnvelopeSimpleIcon,
  GlobeIcon,
} from '@phosphor-icons/react'

import type {
  NotificationChannel,
  NotificationChannelType,
} from '~/lib/models/NotificationChannel'
import Discord from '~/ui/icons/Discord'
import Slack from '~/ui/icons/Slack'
import Telegram from '~/ui/icons/Telegram'

interface ChannelTypeIconProps {
  type: NotificationChannelType
  className?: string
}

export const ChannelTypeIcon = ({
  type,
  className = 'size-5 shrink-0',
}: ChannelTypeIconProps) => {
  switch (type) {
    case 'telegram':
      return <Telegram className={className} />
    case 'discord':
      return <Discord className={className} />
    case 'slack':
      return <Slack className={className} />
    case 'email':
      return (
        <EnvelopeSimpleIcon
          className={`${className} text-slate-500 dark:text-slate-400`}
          weight='duotone'
        />
      )
    case 'webpush':
      return (
        <BellRingingIcon
          className={`${className} text-amber-500 dark:text-amber-400`}
          weight='duotone'
        />
      )
    case 'webhook':
      return (
        <GlobeIcon
          className={`${className} text-emerald-500 dark:text-emerald-400`}
          weight='duotone'
        />
      )
    default:
      return null
  }
}

export const summariseConfig = (channel: NotificationChannel): string => {
  const cfg = (channel.config || {}) as Record<string, any>
  switch (channel.type) {
    case 'email':
      return cfg.address || ''
    case 'telegram':
      return cfg.chatId ? `Chat ${cfg.chatId}` : ''
    case 'slack':
    case 'discord':
    case 'webhook':
      return cfg.url || ''
    case 'webpush':
      return cfg.userAgent || cfg.endpoint || ''
    default:
      return ''
  }
}
