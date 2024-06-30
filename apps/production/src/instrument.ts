import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

import { sentryIgnoreErrors } from './common/constants'

const isProduction = process.env.NODE_ENV === 'production'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: isProduction ? 0.2 : 1.0,
  profilesSampleRate: isProduction ? 0.2 : 1.0,
  ignoreErrors: sentryIgnoreErrors,
  enabled: process.env.SENTRY_ENABLED === 'true',
  // When we will have multiple slave nodes, their names should be set using the .env file
  serverName: process.env.IS_MASTER_NODE ? 'Master node' : 'Slave node #1',
})
