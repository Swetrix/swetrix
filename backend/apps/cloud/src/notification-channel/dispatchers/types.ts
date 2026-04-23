import {
  NotificationChannel,
  NotificationChannelType,
} from '../entity/notification-channel.entity'

export interface RenderedAlertMessage {
  /** Plain/markdown body, rendered from the alert's messageTemplate. */
  body: string
  /** Optional subject (used by email). Defaults to the alert name. */
  subject?: string
  /** The raw alert context, in case a dispatcher wants extra metadata. */
  context: Record<string, unknown>
}

export interface ChannelDispatcher {
  readonly type: NotificationChannelType
  /** Send the rendered alert. Should never throw — log and swallow per-channel failures. */
  send(
    channel: NotificationChannel,
    message: RenderedAlertMessage,
  ): Promise<void>
}
