---
title: NestJS
slug: /nestjs-integration
---

Integrate Swetrix with your [NestJS](https://nestjs.com/) application using the [`@swetrix/node`](https://github.com/swetrix/swetrix-node) server-side SDK to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

Unlike client-side integrations that inject a tracking script into the browser, `@swetrix/node` sends analytics data directly from your server. This means tracking works even when visitors have JavaScript disabled or use ad blockers, and no third-party scripts are loaded in the browser.

## Installation

```bash
npm install @swetrix/node
```

## Setup

Create a dedicated module and service to keep your analytics logic organised and injectable across your application.

### 1. Create the Swetrix service

```typescript
// src/swetrix/swetrix.service.ts
import { Injectable } from '@nestjs/common'
import { Swetrix } from '@swetrix/node'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class SwetrixService {
  private readonly swetrix: Swetrix

  constructor(private readonly configService: ConfigService) {
    this.swetrix = new Swetrix(
      this.configService.get<string>('SWETRIX_PROJECT_ID'),
      {
        disabled: this.configService.get('NODE_ENV') !== 'production',
      },
    )
  }

  trackPageView(ip: string, userAgent: string, options?: Record<string, any>) {
    return this.swetrix.trackPageView(ip, userAgent, options)
  }

  track(ip: string, userAgent: string, options: Record<string, any>) {
    return this.swetrix.track(ip, userAgent, options)
  }

  trackError(ip: string, userAgent: string, options: Record<string, any>) {
    return this.swetrix.trackError(ip, userAgent, options)
  }

  heartbeat(ip: string, userAgent: string) {
    return this.swetrix.heartbeat(ip, userAgent)
  }

  getFeatureFlag(
    name: string,
    ip: string,
    userAgent: string,
    options?: Record<string, any>,
    defaultValue?: boolean,
  ) {
    return this.swetrix.getFeatureFlag(name, ip, userAgent, options, defaultValue)
  }

  getFeatureFlags(ip: string, userAgent: string, options?: Record<string, any>) {
    return this.swetrix.getFeatureFlags(ip, userAgent, options)
  }

  getExperiment(
    experimentId: string,
    ip: string,
    userAgent: string,
    options?: Record<string, any>,
    defaultVariant?: string | null,
  ) {
    return this.swetrix.getExperiment(experimentId, ip, userAgent, options, defaultVariant)
  }

  getProfileId(ip: string, userAgent: string) {
    return this.swetrix.getProfileId(ip, userAgent)
  }

  getSessionId(ip: string, userAgent: string) {
    return this.swetrix.getSessionId(ip, userAgent)
  }

  clearFeatureFlagsCache() {
    this.swetrix.clearFeatureFlagsCache()
  }

  clearExperimentsCache() {
    this.swetrix.clearExperimentsCache()
  }
}
```

### 2. Create the Swetrix module

```typescript
// src/swetrix/swetrix.module.ts
import { Global, Module } from '@nestjs/common'
import { SwetrixService } from './swetrix.service'

@Global()
@Module({
  providers: [SwetrixService],
  exports: [SwetrixService],
})
export class SwetrixModule {}
```

The `@Global()` decorator makes the module available everywhere without needing to import it in every feature module.

### 3. Register in your app module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SwetrixModule } from './swetrix/swetrix.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SwetrixModule,
  ],
})
export class AppModule {}
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), or set the `SWETRIX_PROJECT_ID` environment variable.
:::

## Tracking pageviews

To track pageviews you need to pass the visitor's **IP address** and **User-Agent** header. Without these, unique visitor counting and live visitor tracking won't work. See the [Events API docs](/events-api#unique-visitors-tracking) for details.

### Interceptor approach (recommended)

An interceptor lets you track pageviews automatically on every request without repeating code in each controller:

```typescript
// src/swetrix/swetrix.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { SwetrixService } from './swetrix.service'

@Injectable()
export class SwetrixInterceptor implements NestInterceptor {
  constructor(private readonly swetrix: SwetrixService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest()

    // Fire-and-forget — don't block the response
    this.swetrix.trackPageView(req.ip, req.headers['user-agent'], {
      pg: req.path,
      lc: req.headers['accept-language']?.split(',')[0],
      ref: req.headers['referer'],
    })

    return next.handle()
  }
}
```

Register it globally in your `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { SwetrixInterceptor } from './swetrix/swetrix.interceptor'
import { SwetrixService } from './swetrix/swetrix.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const swetrixService = app.get(SwetrixService)
  app.useGlobalInterceptors(new SwetrixInterceptor(swetrixService))

  await app.listen(3000)
}
bootstrap()
```

:::tip
By not awaiting `trackPageView`, analytics calls happen in the background without adding latency to your responses. This is the recommended pattern for production.
:::

If your NestJS app runs behind a reverse proxy (e.g. Nginx, Cloudflare, or a load balancer), enable the Express `trust proxy` setting in `main.ts` so `req.ip` returns the real client IP:

```typescript
const app = await NestFactory.create(AppModule)
app.getHttpAdapter().getInstance().set('trust proxy', true)
```

### Per-route tracking

You can also track pageviews in individual controllers by injecting the service:

```typescript
import { Controller, Get, Req } from '@nestjs/common'
import { Request } from 'express'
import { SwetrixService } from '../swetrix/swetrix.service'

@Controller()
export class AppController {
  constructor(private readonly swetrix: SwetrixService) {}

  @Get()
  getHome(@Req() req: Request) {
    this.swetrix.trackPageView(req.ip, req.headers['user-agent'], {
      pg: '/',
    })

    return { message: 'Hello World' }
  }
}
```

### Pageview options

The third argument to `trackPageView` is an options object:

| Option | Type | Description |
| --- | --- | --- |
| `pg` | `string` | Page path (e.g. `/home`) |
| `lc` | `string` | Visitor locale (e.g. `en-US`) |
| `ref` | `string` | Referrer URL |
| `so` | `string` | Traffic source (e.g. `utm_source`) |
| `me` | `string` | Traffic medium (e.g. `utm_medium`) |
| `ca` | `string` | Campaign (e.g. `utm_campaign`) |
| `unique` | `boolean` | Only save unique visits |
| `meta` | `object` | Custom metadata key-value pairs |

## Tracking custom events

Track specific actions — API calls, form submissions, purchases, etc.:

```typescript
import { Controller, Post, Req, Body } from '@nestjs/common'
import { Request } from 'express'
import { SwetrixService } from '../swetrix/swetrix.service'

@Controller('api')
export class SubscriptionController {
  constructor(private readonly swetrix: SwetrixService) {}

  @Post('subscribe')
  subscribe(@Req() req: Request, @Body() body: { plan: string }) {
    this.swetrix.track(req.ip, req.headers['user-agent'], {
      ev: 'NEWSLETTER_SUBSCRIBE',
      page: '/subscribe',
      meta: { plan: body.plan },
    })

    return { success: true }
  }
}
```

### Event naming rules

Event names must:

- Contain only English letters (a-Z), numbers (0-9), underscores (`_`), and dots (`.`)
- Be fewer than 64 characters
- Start with an English letter

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `NEWSLETTER_SUBSCRIBE`, `CHECKOUT_COMPLETED`).

## Error tracking

Use a NestJS exception filter to report errors to Swetrix automatically:

```typescript
// src/swetrix/swetrix-exception.filter.ts
import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import { SwetrixService } from './swetrix.service'

@Catch()
export class SwetrixExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly swetrix: SwetrixService) {
    super()
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest()

    const error =
      exception instanceof Error
        ? exception
        : new Error(String(exception))

    this.swetrix.trackError(req.ip, req.headers['user-agent'], {
      name: error.name || 'Error',
      message: error.message,
      stackTrace: error.stack,
      pg: req.path,
    })

    super.catch(exception, host)
  }
}
```

Register the filter globally in `main.ts`:

```typescript
const swetrixService = app.get(SwetrixService)
app.useGlobalFilters(new SwetrixExceptionFilter(swetrixService))
```

You can also track errors from specific services:

```typescript
try {
  const data = await this.httpService.get('https://api.example.com/data')
  return data
} catch (err) {
  this.swetrix.trackError(ip, userAgent, {
    name: err.name,
    message: err.message,
    stackTrace: err.stack,
    pg: '/api/data',
  })

  throw new InternalServerErrorException('Failed to fetch data')
}
```

## Feature flags

Evaluate feature flags server-side based on visitor context:

```typescript
@Get('dashboard')
async getDashboard(@Req() req: Request) {
  const showNewDashboard = await this.swetrix.getFeatureFlag(
    'new-dashboard',
    req.ip,
    req.headers['user-agent'],
    { profileId: req['user']?.id },
    false,
  )

  return { template: showNewDashboard ? 'dashboard-v2' : 'dashboard' }
}
```

You can also fetch all flags at once:

```typescript
const flags = await this.swetrix.getFeatureFlags(ip, userAgent)

if (flags['beta-feature']) {
  // Enable beta feature
}
```

Feature flags are cached for 5 minutes. To force a refresh:

```typescript
this.swetrix.clearFeatureFlagsCache()
```

## A/B testing (experiments)

Run server-side A/B tests and get the assigned variant for each visitor:

```typescript
@Get('pricing')
async getPricing(@Req() req: Request) {
  const variant = await this.swetrix.getExperiment(
    'pricing-experiment-id',
    req.ip,
    req.headers['user-agent'],
    { profileId: req['user']?.id },
    null,
  )

  return {
    showAnnualFirst: variant === 'annual-first',
  }
}
```

## Revenue attribution

Use profile and session IDs to connect analytics with your payment provider (e.g. Paddle, Stripe):

```typescript
@Get('checkout')
async getCheckout(@Req() req: Request) {
  const [profileId, sessionId] = await Promise.all([
    this.swetrix.getProfileId(req.ip, req.headers['user-agent']),
    this.swetrix.getSessionId(req.ip, req.headers['user-agent']),
  ])

  return {
    checkoutConfig: {
      customData: {
        swetrix_profile_id: profileId,
        swetrix_session_id: sessionId,
      },
    },
  }
}
```

## Disable tracking in development

The service example above already disables tracking when `NODE_ENV` isn't `production`. You can also use `devMode` to log calls to the console during development:

```typescript
this.swetrix = new Swetrix(
  this.configService.get<string>('SWETRIX_PROJECT_ID'),
  {
    devMode: this.configService.get('NODE_ENV') === 'development',
  },
)
```

## Using environment variables for your Project ID

Add the `SWETRIX_PROJECT_ID` variable to your `.env` file:

```
SWETRIX_PROJECT_ID=YOUR_PROJECT_ID
```

The `SwetrixService` shown above already reads from `ConfigService`, which loads environment variables automatically when using `ConfigModule.forRoot()`.

## Check your installation

Deploy your application (or temporarily enable `devMode`) and make a few requests. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Self-hosted Swetrix

If you're self-hosting the [Swetrix API](https://github.com/Swetrix/swetrix-api), point the `apiURL` option to your instance:

```typescript
this.swetrix = new Swetrix('YOUR_PROJECT_ID', {
  apiURL: 'https://your-swetrix-instance.com/log',
})
```

## Further reading

- [`@swetrix/node` source code](https://github.com/swetrix/swetrix-node) — full source and documentation for the server-side SDK.
- [Express.js integration](/express-integration) — if you use NestJS with Express under the hood, the Express guide covers lower-level patterns.
- [Events API](/events-api) — API documentation for direct event submission.
- [NestJS documentation](https://docs.nestjs.com/) — official NestJS docs.
