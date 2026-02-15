---
title: Qwik / Qwik City
slug: /qwik-integration
---

Integrate Swetrix with your [Qwik](https://qwik.dev/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

This guide covers both standalone Qwik apps and apps using **Qwik City** (the full-stack framework with file-based routing).

## Installation

Install the Swetrix npm package:

```bash
npm install swetrix
```

### Set up tracking in the root layout (Qwik City)

Swetrix must run in the browser. In Qwik, use `useVisibleTask$` to execute client-side code. `trackViews()` automatically detects client-side route changes, so you only need to call it once.

Open `src/routes/layout.tsx` and add Swetrix initialisation:

```tsx
import { component$, Slot, useVisibleTask$ } from '@builder.io/qwik'
import * as Swetrix from 'swetrix'

export default component$(() => {
  useVisibleTask$(() => {
    Swetrix.init('YOUR_PROJECT_ID')
    Swetrix.trackViews()
  })

  return <Slot />
})
```

### Standalone Qwik (without Qwik City)

If you're not using Qwik City, initialise Swetrix in your root component:

```tsx
import { component$, useVisibleTask$ } from '@builder.io/qwik'
import * as Swetrix from 'swetrix'

export const App = component$(() => {
  useVisibleTask$(() => {
    Swetrix.init('YOUR_PROJECT_ID')
    Swetrix.trackViews()
  })

  return (
    // your app content
  )
})
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### Noscript fallback (optional)

To track visitors who have JavaScript disabled, add a noscript image pixel to your `src/entry.ssr.tsx` or the root `<body>`:

```html
<noscript>
  <img
    src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
    alt=""
    referrerpolicy="no-referrer-when-downgrade"
  />
</noscript>
```

## Disable tracking in development

By default, Swetrix ignores `localhost` traffic. You can also explicitly disable it in development:

```tsx
Swetrix.init('YOUR_PROJECT_ID', {
  disabled: import.meta.env.DEV,
})
```

:::tip
If you want to verify tracking locally during development, set `devMode: true` instead:

```tsx
Swetrix.init('YOUR_PROJECT_ID', {
  devMode: true,
})
```

Remember to remove this before deploying to production.
:::

## Check your installation

Deploy your application (or temporarily enable `devMode`) and visit a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Error tracking

Enable automatic client-side error monitoring by adding `trackErrors()` to your initialisation. This captures unhandled JavaScript errors and reports them to Swetrix.

Update your root layout:

```tsx
useVisibleTask$(() => {
  Swetrix.init('YOUR_PROJECT_ID')
  Swetrix.trackViews()
  Swetrix.trackErrors()
})
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you track specific user interactions — button clicks, form submissions, sign-ups, and more. Import `swetrix` in any component and call `track()`.

### Example: tracking button clicks

```tsx
import { component$ } from '@builder.io/qwik'
import * as Swetrix from 'swetrix'

export const UpgradeButton = component$(() => {
  return (
    <button
      onClick$={() => {
        Swetrix.track({
          ev: 'UPGRADE_CTA_CLICK',
          meta: {
            plan: 'pro',
            location: 'pricing',
          },
        })
      }}
    >
      Upgrade to Pro
    </button>
  )
})
```

### Example: tracking form submissions

```tsx
import { component$ } from '@builder.io/qwik'
import * as Swetrix from 'swetrix'

export const ContactForm = component$(() => {
  return (
    <form
      preventdefault:submit
      onSubmit$={() => {
        Swetrix.track({
          ev: 'CONTACT_FORM_SUBMITTED',
          meta: {
            source: 'support_page',
          },
        })
      }}
    >
      <input type="email" placeholder="you@example.com" required />
      <textarea placeholder="How can we help?" required />
      <button type="submit">Send</button>
    </form>
  )
})
```

### Example: tracking outbound links

```tsx
import { component$ } from '@builder.io/qwik'
import * as Swetrix from 'swetrix'

interface TrackedLinkProps {
  href: string
  eventName?: string
}

export const TrackedLink = component$<TrackedLinkProps>(
  ({ href, eventName = 'OUTBOUND_CLICK' }) => {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick$={() => {
          Swetrix.track({
            ev: eventName,
            meta: { url: href },
          })
        }}
      >
        <Slot />
      </a>
    )
  },
)
```

### Event naming rules

Event names must:

- Contain any characters (including spaces, unicode, etc.)
- Be no longer than 256 characters

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `UPGRADE_CTA_CLICK`, `CONTACT_FORM_SUBMITTED`).

## Using environment variables for your Project ID

Rather than hardcoding your Project ID, you can use an environment variable. Qwik uses Vite under the hood, so prefix client-side variables with `VITE_`:

**1. Set the variable in your `.env` file:**

```
VITE_SWETRIX_PID=YOUR_PROJECT_ID
```

**2. Use it in your layout:**

```tsx
Swetrix.init(import.meta.env.VITE_SWETRIX_PID)
```

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
