<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://swetrix.com/assets/logo_white.png?v=2">
  <img alt="Swetrix" src="https://swetrix.com/assets/logo_blue.png?v=2" height="80">
</picture>
<br /><br />

[![NPM](https://img.shields.io/npm/v/swetrix)](https://www.npmjs.com/package/swetrix)
[![Package size](https://img.shields.io/bundlephobia/minzip/swetrix)](https://bundlephobia.com/package/swetrix)
[![JSDelivr hits](https://data.jsdelivr.com/v1/package/npm/swetrix/badge?style=rounded)](https://www.jsdelivr.com/package/npm/swetrix)
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
  profileId: 'user-123',
})
```

| Option | Description | Default |
|---|---|---|
| `ev` | Event name (max 256 chars). | **required** |
| `unique` | Only count once per session. | `false` |
| `meta` | Key-value metadata (max 20 keys, 1000 chars total). | `{}` |
| `profileId` | Optional profile ID. Overrides the global `profileId` for this event. | `undefined` |

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
// Get all flags. Results are cached for 5 minutes.
const flags = await getFeatureFlags({ profileId: 'user-123' })

// Force a fresh fetch
const freshFlags = await getFeatureFlags({ profileId: 'user-123' }, true)

// Get a single flag. The third argument is an optional fallback value.
const enabled = await getFeatureFlag('dark-mode', { profileId: 'user-123' })
const enabledWithFallback = await getFeatureFlag('dark-mode', { profileId: 'user-123' }, false)

// Clear the shared feature flag / experiment cache
clearFeatureFlagsCache()
```

### A/B Experiments

```javascript
// Get all running experiment assignments. Results are cached for 5 minutes.
const experiments = await getExperiments({ profileId: 'user-123' })

// Force a fresh fetch
const freshExperiments = await getExperiments({ profileId: 'user-123' }, true)

// Get a specific experiment variant. The third argument is an optional fallback variant.
const variant = await getExperiment('checkout-redesign-experiment-id', { profileId: 'user-123' })
const variantWithFallback = await getExperiment('checkout-redesign-experiment-id', { profileId: 'user-123' }, 'control')

// Clear the shared feature flag / experiment cache
clearExperimentsCache()
```

### `startSessionReplay(options?)`

Start recording a session replay. Session replays use `total` privacy by default, which masks text and inputs and blocks media/canvas capture unless you explicitly choose another mode.

```javascript
const replay = await startSessionReplay({
  privacy: 'total',
  sampleRate: 0.25,
  maxDurationMs: 10 * 60 * 1000,
  idleTimeoutMs: 2 * 60 * 1000,
})

// Stop or flush manually when needed
await replay.flush()
await replay.stop()
```

| Option | Description | Default |
|---|---|---|
| `privacy` | Privacy mode: `total`, `normal`, or `none`. | `'total'` |
| `sampleRate` | Fraction of sessions to record (`0` to `1`). | `1` |
| `maxDurationMs` | Stop recording after this duration. | `undefined` |
| `idleTimeoutMs` | Stop recording after this much visitor inactivity. | `undefined` |
| `flushIntervalMs` | Upload buffered replay events at this interval. | `5000` |
| `maxEventsPerChunk` | Upload once this many events are buffered. | `100` |
| `rrweb` | Additional rrweb record options. | `undefined` |

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
