---
title: Next.js
slug: /nextjs-integration
---

Integrate Swetrix with your [Next.js](https://nextjs.org/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

This guide covers both the **App Router** (Next.js 13+) and the **Pages Router**.

## Installation

The recommended approach for Next.js is to install Swetrix as an npm package, which gives you full TypeScript support and works seamlessly with server-side rendering.

```bash
npm install swetrix
```

### App Router (recommended)

Create a client component that initialises Swetrix. `trackViews()` automatically detects client-side route changes, so you only need to call it once.

**1. Create the analytics component**

Create a new file at `src/components/Analytics.tsx` (or `src/components/Analytics.jsx` if you're not using TypeScript):

```tsx
'use client'

import { useEffect } from 'react'
import * as Swetrix from 'swetrix'

export default function Analytics() {
  useEffect(() => {
    Swetrix.init('YOUR_PROJECT_ID')
    Swetrix.trackViews()
  }, [])

  return null
}
```

**2. Add it to your root layout**

Open `src/app/layout.tsx` and render the `Analytics` component:

```tsx
import Analytics from '@/components/Analytics'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### Pages Router

If you're using the Pages Router, add Swetrix to your `_app.tsx` (or `_app.jsx`) file. `trackViews()` automatically detects route changes, so a single call is all you need.

```tsx
import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import * as Swetrix from 'swetrix'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    Swetrix.init('YOUR_PROJECT_ID')
    Swetrix.trackViews()
  }, [])

  return <Component {...pageProps} />
}
```

### Noscript fallback (optional)

To track visitors who have JavaScript disabled, add a noscript image pixel to your root layout (App Router) or `_document.tsx` (Pages Router).

**App Router** — add to `src/app/layout.tsx` inside `<body>`:

```tsx
<noscript>
  <img
    src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
    alt=""
    referrerPolicy="no-referrer-when-downgrade"
  />
</noscript>
```

**Pages Router** — add to `pages/_document.tsx` inside `<body>`:

```tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        <noscript>
          <img
            src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
            alt=""
            referrerPolicy="no-referrer-when-downgrade"
          />
        </noscript>
      </body>
    </Html>
  )
}
```

## Disable tracking in development

By default, Swetrix ignores `localhost` traffic. If you want to be explicit about it, you can conditionally disable tracking based on your environment:

```tsx
Swetrix.init('YOUR_PROJECT_ID', {
  disabled: process.env.NODE_ENV === 'development',
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

Enable automatic client-side error monitoring by adding `trackErrors()` to your analytics component. This captures unhandled JavaScript errors and reports them to Swetrix.

**App Router** — update `src/components/Analytics.tsx`:

```tsx
useEffect(() => {
  Swetrix.init('YOUR_PROJECT_ID')
  Swetrix.trackViews()
  Swetrix.trackErrors()
}, [])
```

**Pages Router** — update `_app.tsx`:

```tsx
useEffect(() => {
  Swetrix.init('YOUR_PROJECT_ID')
  Swetrix.trackViews()
  Swetrix.trackErrors()
}, [])
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you track specific user interactions — button clicks, form submissions, sign-ups, purchases, and more. Import `swetrix` in any client component and call `track()`.

### Example: tracking button clicks

```tsx
'use client'

import * as Swetrix from 'swetrix'

export default function PricingCTA() {
  const handleClick = () => {
    Swetrix.track({
      ev: 'PRICING_CTA_CLICK',
      meta: {
        plan: 'pro',
        location: 'hero',
      },
    })
  }

  return (
    <button onClick={handleClick}>
      Upgrade to Pro
    </button>
  )
}
```

### Example: tracking form submissions

```tsx
'use client'

import * as Swetrix from 'swetrix'

export default function NewsletterForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    Swetrix.track({
      ev: 'NEWSLETTER_SIGNUP',
      meta: {
        source: 'footer',
      },
    })

    // ...submit logic
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="you@example.com" required />
      <button type="submit">Subscribe</button>
    </form>
  )
}
```

### Example: tracking outbound links

Create a reusable component for external links:

```tsx
'use client'

import * as Swetrix from 'swetrix'

interface TrackedLinkProps {
  href: string
  children: React.ReactNode
  eventName?: string
}

export default function TrackedLink({
  href,
  children,
  eventName = 'OUTBOUND_CLICK',
}: TrackedLinkProps) {
  const handleClick = () => {
    Swetrix.track({
      ev: eventName,
      meta: { url: href },
    })
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
      {children}
    </a>
  )
}
```

### Event naming rules

Event names must:

- Contain any characters (including spaces, unicode, etc.)
- Be no longer than 256 characters

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `PRICING_CTA_CLICK`, `NEWSLETTER_SIGNUP`).

## Using environment variables for your Project ID

Rather than hardcoding your Project ID, you can use a Next.js environment variable. Since the analytics component runs on the client, the variable must be prefixed with `NEXT_PUBLIC_`.

**1. Add to your `.env.local` file:**

```
NEXT_PUBLIC_SWETRIX_PID=YOUR_PROJECT_ID
```

**2. Reference it in your analytics component:**

```tsx
Swetrix.init(process.env.NEXT_PUBLIC_SWETRIX_PID!)
```

## Bypassing adblockers with a proxy

Some adblockers may block requests to the Swetrix API domain. You can proxy analytics traffic through your own domain using Next.js rewrites. This keeps all requests first-party, making them invisible to adblockers.

See the full setup guide: [How to proxy Swetrix with Next.js](/adblockers/guides/nextjs).

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
- [How to proxy Swetrix with Next.js](/adblockers/guides/nextjs) — avoid adblockers by proxying analytics through your domain.
