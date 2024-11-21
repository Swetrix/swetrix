import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

import { sentryIgnoreErrors } from './common/constants'

const isProduction = process.env.NODE_ENV === 'production'

if (process.env.SENTRY_ENABLED === 'true') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampler: ({ name, attributes, parentSampled }) => {
      // Do not sample Telegram webhook-related traces
      if (name.includes('api.telegram.org')) {
        return 0
      }

      // Do not sample CRON task for Telegram messages
      if (name.includes('FROM `message`')) {
        return 0
      }

      // Do not sample middlewares
      if (attributes?.['express.type'] === 'middleware') {
        return 0
      }

      // Redis events are not really important, don't sample too much
      if (attributes?.['db.system'] === 'redis') {
        return 0.01
      }

      // Don't sample mysql events
      if (attributes?.['db.system'] === 'mysql') {
        return 0
      }

      // Do not sample LOG / heartbeat events
      if (
        name.includes('log/error') ||
        name.includes('log/hb') ||
        name.includes('log/custom') ||
        name.includes('getHeartBeatStats') ||
        name.includes('AnalyticsController.log') ||
        name.includes('/log')
      ) {
        return 0
      }

      // Do not sample health checks ever
      if (name.includes('/ping') || name.includes('health')) {
        return 0
      }

      // These are important - take a big sample
      if (name.includes('auth')) {
        return 1
      }

      // Continue trace decision, if there is any parentSampled information
      if (typeof parentSampled === 'boolean') {
        return parentSampled
      }

      // Else, use default sample rate
      return isProduction ? 0.2 : 1
    },
    ignoreErrors: sentryIgnoreErrors,
    // When we will have multiple slave nodes, their names should be set using the .env file
    serverName: process.env.IS_PRIMARY_NODE
      ? 'Primary node'
      : 'Secondary node #1',
  })
}
