<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://swetrix.com/assets/logo_white.png">
  <img alt="" src="https://swetrix.com/assets/logo_blue.png" height="80">
</picture>

# `@swetrix/node` - Swetrix NodeJS integration

This repository contains the analytics script for server-side tracking of your website.

Feel free to contribute to the source code by opening a pull requests. \
For any questions, you can open an issue ticket, refer to our [FAQs](https://swetrix.com/#faq) page or reach us at our [contact page](https://swetrix.com/contact).

# Installation

`npm install @swetrix/node`

# Usage

## Set up

```javascript
// alternatively you can use the import syntax
const { Swetrix } = require('@swetrix/node')
```

```javascript
const swetrix = new Swetrix('YOUR_PROJECT_ID')
```

The `Swetrix` constructor accepts 2 params: project ID (string) and options object.\
Options object is the following (it's similar to what the main Swetrix tracking library looks like):

```typescript
export interface LibOptions {
  /**
   * When set to `true`, all tracking logs will be printed to console.
   */
  devMode?: boolean

  /**
   * When set to `true`, the tracking library won't send any data to server.
   * Useful for development purposes when this value is set based on `.env` var.
   */
  disabled?: boolean

  /**
   * Set a custom URL of the API server (for selfhosted variants of Swetrix).
   */
  apiURL?: string

  /**
   * If set to `true`, only unique events will be saved.
   * This param is useful when tracking single-page landing websites.
   */
  unique?: boolean

  /**
   * Optional profile ID for long-term user tracking.
   * If set, it will be used for all pageviews and events unless overridden per-call.
   */
  profileId?: string
}
```

## Important: Async/Await Support

All tracking methods in this SDK return Promises, allowing you to await them if needed:

```javascript
// You can await tracking calls
await swetrix.trackPageView(ip, userAgent, { pg: '/home' })
await swetrix.track(ip, userAgent, { ev: 'button_click' })

// Or fire-and-forget (no await)
swetrix.trackPageView(ip, userAgent, { pg: '/home' })
```

## Tracking pageviews

**To track pageviews, custom events and heartbeat events you have to pass your website visitors IP address and user agent, otherwise functionality like unique visitors or live visitors tracking will not work!**\
You can read about it in details on our [Events API](https://docs.swetrix.com/events-api#unique-visitors-tracking) documentation page.

Tracking pageviews can be done by calling the following function:

```javascript
await swetrix.trackPageView('192.155.52.12', 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0', {
  lc: 'en-US',
  pg: '/hi',
  ref: 'https://www.swetrix.com/',
})
```

It accepts 3 arguments:

- Client IP address
- Client user agent
- Pageview object

The pageview object is described by the following interfaces:

```typescript
export interface TrackPageViewOptions {
  /**
   * Visitor's timezone (used as a backup in case IP geolocation fails). I.e. if it's set to Europe/Kiev and IP geolocation fails, we will set the country of this entry to Ukraine)
   */
  tz?: string

  /** A page to record the pageview event for (e.g. /home). All our scripts send the pg string with a slash (/) at the beginning, it's not a requirement but it's best to do the same so the data would be consistent when used together with our official scripts */
  pg?: string

  /** A locale of the user (e.g. en-US or uk-UA) */
  lc?: string

  /** A referrer URL (e.g. https://example.com/) */
  ref?: string

  /** A source of the pageview (e.g. ref, source or utm_source GET parameter) */
  so?: string

  /** A medium of the pageview (e.g. utm_medium GET parameter) */
  me?: string

  /** A campaign of the pageview (e.g. utm_campaign GET parameter) */
  ca?: string

  /** If set to true, only unique visits will be saved */
  unique?: boolean

  /** An object with performance metrics related to the page load. See Performance metrics for more details */
  perf?: PerformanceMetrics

  /** Pageview-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }

  /** Optional profile ID for long-term user tracking. Overrides the global profileId if set. */
  profileId?: string
}

export interface PerformanceMetrics {
  /* DNS Resolution time */
  dns?: number

  /* TLS handshake time */
  tls?: number

  /* Connection time */
  conn?: number

  /* Response Time (Download) */
  response?: number

  /* Browser rendering the HTML page time */
  render?: number

  /* DOM loading timing */
  dom_load?: number

  /* Page load timing */
  page_load?: number

  /* Time to first byte */
  ttfb?: number
}
```

## Tracking custom events

You can track custom events by calling `track` function, the syntax is similar to tracking pageviews:

```javascript
await swetrix.track('192.155.52.12', 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0', {
  ev: 'hello1234',
})
```

This function accepts 3 arguments:

- Client IP address
- Client user agent
- Custom event object

The custom event object is described by the following interface:

```typescript
export interface TrackEventOptions {
  /**
   * An event identifier you want to track. This has to be a string, which:
   * 1. Contains only English letters (a-Z A-Z), numbers (0-9), underscores (_) and dots (.).
   * 2. Is fewer than 64 characters.
   * 3. Starts with an English letter.
   */
  ev: string

  /** If set to true, only 1 custom event will be saved per session */
  unique?: boolean

  /** A page that user sent data from (e.g. /home) */
  page?: string

  /** A locale of the user (e.g. en-US or uk-UA) */
  lc?: string

  /** A referrer URL (e.g. https://example.com/) */
  ref?: string

  /** A source of the event (e.g. ref, source or utm_source GET parameter) */
  so?: string

  /** A medium of the event (e.g. utm_medium GET parameter) */
  me?: string

  /** A campaign of the event (e.g. utm_campaign GET parameter) */
  ca?: string

  /** Event-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }

  /** Optional profile ID for long-term user tracking. Overrides the global profileId if set. */
  profileId?: string
}
```

## Tracking errors

You can also track error events by calling `trackError` function, the syntax is similar to tracking pageviews:

```javascript
await swetrix.trackError('192.155.52.12', 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0', {
  name: 'ParseError',
  message: 'Malformed input',
  lineno: 1520,
  colno: 26,
  filename: 'https://example.com/broken.js',
})
```

This function accepts 3 arguments:

- Client IP address
- Client user agent
- Error object

The error object is described by the following interface:

```typescript
export interface TrackErrorOptions {
  /**
   * Error name (e.g. ParseError).
   */
  name: string

  /**
   * Error message (e.g. Malformed input).
   */
  message?: string | null

  /**
   * On what line in your code did the error occur (e.g. 1520)
   */
  lineno?: number | null

  /**
   * On what column in your code did the error occur (e.g. 26)
   */
  colno?: number | null

  /**
   * In what file did the error occur (e.g. https://example.com/broken.js)
   */
  filename?: string | null

  /**
   * Stack trace of the error.
   */
  stackTrace?: string | null

  /**
   * Visitor's timezone (used as a backup in case IP geolocation fails).
   */
  tz?: string

  /** A locale of the user (e.g. en-US or uk-UA) */
  lc?: string

  /** A page to record the error event for (e.g. /home) */
  pg?: string

  /** Error-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }
}
```

## Heartbeat events

Heartbeat events are used to determine if the user session is still active. This allows you to see the 'Live Visitors' counter in the Dashboard panel. It's recommended to send heartbeat events every 30 seconds. We also extend the session lifetime after receiving a pageview or custom event.

You can send heartbeat events by calling the following function:

```javascript
await swetrix.heartbeat('192.155.52.12', 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0')
```

Make sure to pass your website visitors IP address and User Agent instead of these example values.

## Feature Flags

Feature flags allow you to control feature rollouts to your users. You can evaluate flags server-side based on user context.

### Getting all feature flags

```javascript
const flags = await swetrix.getFeatureFlags(
  '192.155.52.12',
  'Mozilla/5.0...',
  { profileId: 'user-123' }, // optional
)

if (flags['new-checkout']) {
  // Show new checkout flow
}
```

### Getting a single feature flag

```javascript
const isEnabled = await swetrix.getFeatureFlag(
  'dark-mode',
  '192.155.52.12',
  'Mozilla/5.0...',
  { profileId: 'user-123' }, // optional
  false, // default value if flag not found
)

if (isEnabled) {
  // Enable dark mode
}
```

### Clearing the feature flags cache

Feature flags are cached for 5 minutes by default. You can force a refresh:

```javascript
// Clear the cache
swetrix.clearFeatureFlagsCache()

// Or force refresh on next call
const flags = await swetrix.getFeatureFlags(ip, userAgent, options, true)
```

## A/B Testing (Experiments)

Run A/B tests and get the assigned variant for each user.

### Getting all experiments

```javascript
const experiments = await swetrix.getExperiments(
  '192.155.52.12',
  'Mozilla/5.0...',
  { profileId: 'user-123' }, // optional
)

// experiments = { 'exp-123': 'variant-a', 'exp-456': 'control' }
const checkoutVariant = experiments['checkout-experiment-id']

if (checkoutVariant === 'new-checkout') {
  showNewCheckout()
} else {
  showOriginalCheckout()
}
```

### Getting a single experiment variant

```javascript
const variant = await swetrix.getExperiment(
  'checkout-redesign-experiment-id',
  '192.155.52.12',
  'Mozilla/5.0...',
  { profileId: 'user-123' }, // optional
  null, // default variant if experiment not found
)

if (variant === 'new-checkout') {
  showNewCheckout()
} else if (variant === 'control') {
  showOriginalCheckout()
} else {
  // Experiment not running or user not included
  showOriginalCheckout()
}
```

### Clearing the experiments cache

```javascript
swetrix.clearExperimentsCache()
```

## Profile ID

Get an anonymous profile ID for long-term user tracking. Useful for revenue attribution with payment providers.

```javascript
const profileId = await swetrix.getProfileId('192.155.52.12', 'Mozilla/5.0...')

// Pass to your payment provider for revenue attribution
// e.g., Paddle Checkout customData: { swetrix_profile_id: profileId }
```

If you set a `profileId` in the constructor options, it will be returned directly instead of generating one.

## Session ID

Get the current session ID for the visitor. Session IDs are generated server-side based on IP and user agent.

```javascript
const sessionId = await swetrix.getSessionId('192.155.52.12', 'Mozilla/5.0...')

// Use for revenue attribution or session-based tracking
```

## Revenue Attribution Example

Here's a complete example of using profile and session IDs for revenue attribution with Paddle:

```javascript
const swetrix = new Swetrix('YOUR_PROJECT_ID')

app.get('/checkout', async (req, res) => {
  const ip = req.ip
  const userAgent = req.headers['user-agent']

  const [profileId, sessionId] = await Promise.all([
    swetrix.getProfileId(ip, userAgent),
    swetrix.getSessionId(ip, userAgent),
  ])

  res.json({
    checkoutConfig: {
      // ... your checkout configuration
      customData: {
        swetrix_profile_id: profileId,
        swetrix_session_id: sessionId,
      },
    },
  })
})
```

# Selfhosted API

If you are selfhosting the [Swetrix-API](https://github.com/Swetrix/swetrix-api), be sure to point the `apiURL` parameter to: `https://yourapiinstance.com/log`
