const NOTIFICATION_CHANNEL_API_PATH = '/api/notification-channel'

const joinClientUrl = (clientUrl: string, path: string) =>
  `${clientUrl.replace(/\/$/, '')}${path}`

export const buildNotificationChannelVerifyUrl = (
  clientUrl: string,
  token: string,
) =>
  joinClientUrl(
    clientUrl,
    `${NOTIFICATION_CHANNEL_API_PATH}/verify/${encodeURIComponent(token)}`,
  )

export const buildNotificationChannelUnsubscribeUrl = (
  clientUrl: string,
  token: string,
) =>
  joinClientUrl(
    clientUrl,
    `${NOTIFICATION_CHANNEL_API_PATH}/unsubscribe/${encodeURIComponent(token)}`,
  )
