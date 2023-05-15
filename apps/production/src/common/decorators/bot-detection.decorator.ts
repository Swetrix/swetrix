import { SetMetadata } from '@nestjs/common'

export const IS_BOT_DETECTION_ENABLED = 'isBotDetectionEnabled'
export const BotDetection = () => SetMetadata(IS_BOT_DETECTION_ENABLED, true)
