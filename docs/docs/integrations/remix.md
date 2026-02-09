---
title: Remix
slug: /remix-integration
---

Integrate Swetrix with your [Remix](https://remix.run/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

## Installation

Install the Swetrix npm package:

```bash
npm install swetrix
```

### Set up the analytics component

Since Swetrix runs in the browser, you need a client-only component that initialises tracking and responds to route changes. Remix uses React Router under the hood, so you can use `useLocation()` to detect navigations.

**1. Create the analytics component**

Create `app/components/Analytics.tsx`:

```tsx
import { useEffect } from 'react'
import { useLocation } from '@remix-run/react'
import * as Swetrix from 'swetrix'

export default function Analytics() {
  const location = useLocation()

  useEffect(() => {
    Swetrix.init('YOUR_PROJECT_ID')
    Swetrix.trackViews()
  }, [])

  useEffect(() => {
    Swetrix.trackViews()
  }, [location])

  return null
}
```

**2. Add it to your root route**

Open `app/root.tsx` and render the `Analytics` component inside the `<body>`. Use Remix's `ClientOnly` approach — since Swetrix must run in the browser, wrap the import so it only loads client-side:

```tsx
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react'
import Analytics from '~/components/Analytics'

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <Analytics />
      </body>
    </html>
  )
}
```

Swetrix guards against server-side execution internally, so the component is safe to render in the root route without extra checks.

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### Noscript fallback (optional)

To track visitors who have JavaScript disabled, add a noscript image pixel to your `app/root.tsx` inside `<body>`:

```tsx
<noscript>
  <img
    src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
    alt=""
    referrerPolicy="no-referrer-when-downgrade"
  />
</noscript>
```

## Disable tracking in development

By default, Swetrix ignores `localhost` traffic. You can also explicitly disable it in development:

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

Update `app/components/Analytics.tsx`:

```tsx
useEffect(() => {
  Swetrix.init('YOUR_PROJECT_ID')
  Swetrix.trackViews()
  Swetrix.trackErrors()
}, [])
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you track specific user interactions — button clicks, form submissions, sign-ups, and more. Import `swetrix` in any component and call `track()`.

### Example: tracking button clicks

```tsx
import * as Swetrix from 'swetrix'

export default function UpgradeButton() {
  const handleClick = () => {
    Swetrix.track({
      ev: 'UPGRADE_CTA_CLICK',
      meta: {
        plan: 'pro',
        location: 'pricing',
      },
    })
  }

  return <button onClick={handleClick}>Upgrade to Pro</button>
}
```

### Example: tracking Remix form actions

Remix encourages server-side form handling via `action` functions. You can track submissions on the client before the form posts:

```tsx
import { Form } from '@remix-run/react'
import * as Swetrix from 'swetrix'

export default function WaitlistForm() {
  const handleSubmit = () => {
    Swetrix.track({
      ev: 'WAITLIST_SIGNUP',
      meta: {
        source: 'landing_page',
      },
    })
  }

  return (
    <Form method="post" onSubmit={handleSubmit}>
      <input type="email" name="email" placeholder="you@example.com" required />
      <button type="submit">Join waitlist</button>
    </Form>
  )
}
```

### Example: tracking outbound links

```tsx
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

- Contain only English letters (a-Z), numbers (0-9), underscores (`_`), and dots (`.`)
- Be fewer than 64 characters
- Start with an English letter

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `UPGRADE_CTA_CLICK`, `WAITLIST_SIGNUP`).

## Using environment variables for your Project ID

Rather than hardcoding your Project ID, you can use an environment variable. In Remix, client-side environment variables need to be explicitly passed from the server.

**1. Set the variable in your `.env` file:**

```
SWETRIX_PID=YOUR_PROJECT_ID
```

**2. Expose it to the client via your root loader:**

```tsx
// app/root.tsx
import { json } from '@remix-run/node'
import type { LoaderFunctionArgs } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    ENV: {
      SWETRIX_PID: process.env.SWETRIX_PID,
    },
  })
}
```

**3. Make it available on `window` and pass it to the analytics component:**

In your root component, render the environment variables as a script tag:

```tsx
import { useLoaderData } from '@remix-run/react'

export default function App() {
  const { ENV } = useLoaderData<typeof loader>()

  return (
    <html lang="en">
      <head>{/* ... */}</head>
      <body>
        <Outlet />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`,
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
```

Then in your analytics component:

```tsx
Swetrix.init(window.ENV.SWETRIX_PID)
```

## Bypassing adblockers with a proxy

Some adblockers may block requests to the Swetrix API domain. Remix apps are commonly deployed on platforms that support request rewrites (Vercel, Netlify, Cloudflare). You can proxy analytics traffic through your own domain to keep all requests first-party.

If your Remix app runs on a Node server, you can add a proxy route at `app/routes/sproxy.$.tsx`:

```tsx
import type { LoaderFunctionArgs } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const target = `https://api.swetrix.com/log${url.pathname.replace('/sproxy', '')}${url.search}`

  return fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' ? await request.text() : undefined,
  })
}

export async function action({ request }: LoaderFunctionArgs) {
  return loader({ request, params: {}, context: {} })
}
```

Then update your analytics initialisation:

```tsx
Swetrix.init('YOUR_PROJECT_ID', {
  apiURL: '/sproxy',
})
```

:::note
Use a generic route name instead of `/analytics` or `/log` — common names are blocked by adblockers.
:::

## Further reading

- [React integration](/react-integration) — for plain React apps without a framework.
- [Next.js integration](/nextjs-integration) — for Next.js applications.
- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
