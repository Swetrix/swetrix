<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://swetrix.com/assets/logo_white.png">
  <img alt="Swetrix" src="https://swetrix.com/assets/logo_blue.png" height="80">
</picture>
<br /><br />

[![NPM](https://img.shields.io/npm/v/swetrix)](https://www.npmjs.com/package/swetrix)
[![Package size](https://img.shields.io/bundlephobia/minzip/swetrix)](https://bundlephobia.com/package/swetrix)
[![JSDelivr hits](https://data.jsdelivr.com/v1/package/gh/Swetrix/swetrix-js/badge?style=rounded)](https://data.jsdelivr.com/v1/package/gh/Swetrix/swetrix-js/stats)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/swetrix/swetrix-js/issues)

# Swetrix Tracking Script

Privacy-first, lightweight analytics tracking library for [Swetrix](https://swetrix.com). Tracks page views, custom events, errors, feature flags, and A/B experiments — all without cookies or invading user privacy.

## Installation

### npm / yarn / pnpm

```bash
npm install swetrix
```

### CDN

```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```

## Quick Start

### ES Modules

```javascript
import { init, trackViews, trackErrors } from 'swetrix'

init('YOUR_PROJECT_ID')
trackViews()
trackErrors()
```

### CDN / Script Tag

```html
<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
    swetrix.trackErrors()
  })
</script>
```

## API

### `init(projectId, options?)`

Initialise the library. Must be called before any other method.

```javascript
init('YOUR_PROJECT_ID', {
  apiURL: 'https://api.swetrix.com/log',
  devMode: false,
  disabled: false,
  respectDNT: false,
  profileId: 'user-123',
})
```

| Option | Description | Default |
|---|---|---|
| `apiURL` | API endpoint. Change this if you're self-hosting. | `'https://api.swetrix.com/log'` |
| `devMode` | When `true`, localhost events are sent to the server. | `false` |
| `disabled` | When `true`, no data is sent. Useful for dev environments. | `false` |
| `respectDNT` | When `true`, disables tracking for users with Do Not Track enabled. | `false` |
| `profileId` | Profile ID for long-term user tracking (MAU/DAU). | `undefined` |

### `trackViews(options?)`

Automatically tracks page views, including navigation changes in SPAs. Returns a `Promise<{ stop() }>`.

```javascript
const { stop } = await trackViews({
  hash: false,
  search: false,
  unique: false,
  heartbeatOnBackground: false,
  callback: undefined,
})

// Stop tracking when needed
stop()
```

| Option | Description | Default |
|---|---|---|
| `hash` | Track hash-based routing (e.g. `/#/path`). | `false` |
| `search` | Track search/query-based routing (e.g. `/path?query`). | `false` |
| `unique` | Only count unique page views per session. | `false` |
| `heartbeatOnBackground` | Send heartbeat when the tab is not active. | `false` |
| `callback` | A function to edit or prevent pageview payloads. Return `false` to block, `true` to send as-is, or return a modified payload object. | `undefined` |

### `track(event)`

Track custom events (e.g. button clicks, sign-ups).

```javascript
track({
  ev: 'signup',
  unique: true,
  meta: { plan: 'pro', source: 'landing' },
})
```

| Option | Description | Default |
|---|---|---|
| `ev` | Event name (max 256 chars). | **required** |
| `unique` | Only count once per session. | `false` |
| `meta` | Key-value metadata (max 20 keys, 1000 chars total). | `{}` |

### `trackErrors(options?)`

Automatically captures client-side errors. Returns `{ stop() }`.

```javascript
const { stop } = trackErrors({
  sampleRate: 1,
  callback: undefined,
})
```

| Option | Description | Default |
|---|---|---|
| `sampleRate` | Fraction of errors to send (`0` to `1`). | `1` |
| `callback` | Edit or prevent error payloads. Return `false` to block. | `undefined` |

### `trackError(payload)`

Manually report an error.

```javascript
trackError({
  name: 'PaymentError',
  message: 'Card declined',
  meta: { gateway: 'stripe' },
})
```

### `pageview(options)`

Manually track a single page view (useful for custom routing).

```javascript
pageview({
  payload: { pg: '/checkout', lc: 'en-US' },
  unique: true,
})
```

### Feature Flags

```javascript
// Get all flags
const flags = await getFeatureFlags({ profileId: 'user-123' })

// Get a single flag
const enabled = await getFeatureFlag('dark-mode', { profileId: 'user-123' })

// Clear cache
clearFeatureFlagsCache()
```

### A/B Experiments

```javascript
// Get all experiments
const experiments = await getExperiments({ profileId: 'user-123' })

// Get a specific experiment variant
const variant = await getExperiment('checkout-redesign', { profileId: 'user-123' })

// Clear cache
clearExperimentsCache()
```

### Session & Profile IDs

```javascript
const profileId = await getProfileId()
const sessionId = await getSessionId()
```

These are useful for revenue attribution with payment providers like Paddle.

## Self-Hosting

If you're running a self-hosted [Swetrix API](https://github.com/Swetrix/swetrix-api) instance, point the `apiURL` to your server:

```javascript
init('YOUR_PROJECT_ID', {
  apiURL: 'https://your-api.example.com/log',
})
```

## Documentation

Full reference and guides are available at [docs.swetrix.com](https://docs.swetrix.com).

## Contributing

Contributions are welcome — feel free to [open an issue](https://github.com/swetrix/swetrix-js/issues) or submit a pull request.

## License

MIT
