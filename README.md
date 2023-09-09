<img src="https://swetrix.com/assets/logo_blue.png" alt="" height="80" />

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
   * When set to `true`, all tracking logs will be printed to console and localhost events will be sent to server.
   */
  debug?: boolean

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

  /** A list of Regular Expressions or string pathes to ignore. */
  ignore?: Array<string | RegExp>
  
  /** Do not send paths from ignore list to API. If set to `false`, the page view information will be sent to the Swetrix API, but the page will be displayed as a 'Redacted page' in the dashboard. */
  doNotAnonymise?: boolean
}
```

## Tracking pageviews
**To track pageviews, custom events and heartbeat events you have to pass your website visitors IP address and user agent, otherwise functionality like unique visitors or live visitors tracking will not work!**\
You can read about it in details on our [Events API](https://docs.swetrix.com/events-api#unique-visitors-tracking) documentation page.

Tracking pageviews can be done by calling the following function:

```javascript
swetrix.trackPageView('192.155.52.12', 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0', {
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

  /** Previous page user was on */
  prev?: string

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
swetrix.track('192.155.52.12', 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0', {
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
}
```

## Heartbeat events
Heartbeat events are used to determine if the user session is still active. This allows you to see the 'Live Visitors' counter in the Dashboard panel. It's recommended to send heartbeat events every 30 seconds. We also extend the session lifetime after receiving a pageview or custom event.

You can send heartbeat events by calling the following function:
```javascript
swetrix.heartbeat('192.155.52.12', 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0')
```

Make sure to pass your website visitors IP address and User Agent instead of these example values.

# Selfhosted API
If you are selfhosting the [Swetrix-API](https://github.com/Swetrix/swetrix-api), be sure to point the `apiUrl` parameter to: `https://yourapiinstance.com/log`

# Donate
You can support the project by donating us at https://ko-fi.com/andriir \
We can only run our services by once again asking for your financial support!
