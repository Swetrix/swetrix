---
title: React (Vite / CRA)
slug: /react-integration
---

Integrate Swetrix with your [React](https://react.dev/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

This guide covers React apps built with **Vite**, **Create React App**, or any other bundler. If you're using a React framework, see the dedicated guides for [Next.js](/nextjs-integration) and [Remix](/remix-integration) instead.

## Installation

Install the Swetrix npm package:

```bash
npm install swetrix
```

### Basic setup (single-page apps without routing)

If your app doesn't use client-side routing, you can initialise Swetrix once in your entry point.

Open `src/main.tsx` (Vite) or `src/index.tsx` (CRA):

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Swetrix from 'swetrix'
import App from './App'

Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### With React Router

`trackViews()` automatically detects client-side route changes (including React Router navigations), so you only need to call it once. Initialise Swetrix in your entry point the same way as above — no route-change listener needed.

### Noscript fallback (optional)

To track visitors who have JavaScript disabled, add a noscript image pixel to your `index.html`:

```html
<body>
  <div id="root"></div>

  <noscript>
    <img
      src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
      alt=""
      referrerpolicy="no-referrer-when-downgrade"
    />
  </noscript>
</body>
```

## Disable tracking in development

By default, Swetrix ignores `localhost` traffic. You can also explicitly disable it based on your environment:

```tsx
Swetrix.init('YOUR_PROJECT_ID', {
  disabled: import.meta.env.DEV, // Vite
  // disabled: process.env.NODE_ENV === 'development', // CRA
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

Build and deploy your application (or temporarily enable `devMode`) and visit a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Error tracking

Enable automatic client-side error monitoring by adding `trackErrors()` to your initialisation. This captures unhandled JavaScript errors and reports them to Swetrix.

Update your analytics setup:

```tsx
useEffect(() => {
  Swetrix.init('YOUR_PROJECT_ID')
  Swetrix.trackViews()
  Swetrix.trackErrors()
}, [])
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you track specific user interactions — button clicks, form submissions, sign-ups, purchases, and more. Import `swetrix` in any component and call `track()`.

### Example: tracking button clicks

```tsx
import * as Swetrix from 'swetrix'

export default function SignUpButton() {
  const handleClick = () => {
    Swetrix.track({
      ev: 'SIGNUP_CTA_CLICK',
      meta: {
        location: 'navbar',
      },
    })
  }

  return <button onClick={handleClick}>Sign up</button>
}
```

### Example: tracking form submissions

```tsx
import * as Swetrix from 'swetrix'

export default function ContactForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    Swetrix.track({
      ev: 'CONTACT_FORM_SUBMITTED',
      meta: {
        source: 'support_page',
      },
    })

    // ...submit logic
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="you@example.com" required />
      <textarea placeholder="How can we help?" required />
      <button type="submit">Send</button>
    </form>
  )
}
```

### Example: tracking outbound links

Create a reusable component for external links:

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

- Contain any characters (including spaces, unicode, etc.)
- Be no longer than 256 characters

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `SIGNUP_CTA_CLICK`, `CONTACT_FORM_SUBMITTED`).

## Using environment variables for your Project ID

Rather than hardcoding your Project ID, you can use an environment variable.

**Vite** — prefix with `VITE_`:

```
VITE_SWETRIX_PID=YOUR_PROJECT_ID
```

```tsx
Swetrix.init(import.meta.env.VITE_SWETRIX_PID)
```

**Create React App** — prefix with `REACT_APP_`:

```
REACT_APP_SWETRIX_PID=YOUR_PROJECT_ID
```

```tsx
Swetrix.init(process.env.REACT_APP_SWETRIX_PID!)
```

## Further reading

- [Next.js integration](/nextjs-integration) — if you're using Next.js, follow the dedicated guide instead.
- [Remix integration](/remix-integration) — if you're using Remix, follow the dedicated guide instead.
- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
