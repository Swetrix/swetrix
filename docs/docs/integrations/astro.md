---
title: Astro
slug: /astro-integration
---

Integrate Swetrix with your [Astro](https://astro.build/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

Astro is a web framework designed for content-rich websites that ships minimal JavaScript to the browser by default. This guide covers both the **CDN script** approach and the **npm package** approach, including support for Astro's **View Transitions**.

## Installation

There are two ways to add Swetrix to your Astro site:

| Approach | Best for |
| --- | --- |
| **CDN script** | Simple sites, blogs, and documentation — no build-time dependency required |
| **npm package** | Full TypeScript support, tighter integration with island components, more configuration options |

### Option A: CDN script (recommended for most sites)

The simplest way to add Swetrix is to include the tracking script in a shared layout component. No npm install needed.

**1. Add the script to your layout**

Open your base layout (e.g. `src/layouts/Layout.astro`) and add the Swetrix script inside the `<head>`:

```html
---
// src/layouts/Layout.astro
export interface Props {
  title: string;
}

const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>

    <!-- Swetrix Analytics -->
    <script src="https://swetrix.org/swetrix.js" defer></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        swetrix.init('YOUR_PROJECT_ID')
        swetrix.trackViews()
      })
    </script>
  </head>
  <body>
    <slot />
  </body>
</html>
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

**2. Use the layout on your pages**

Make sure your pages use this layout so the script is included on every page:

```html
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="Home">
  <h1>Welcome to my site</h1>
</Layout>
```

Since Astro builds multi-page applications by default, each navigation triggers a full page load and Swetrix will automatically track each page view.

### Option B: npm package

If you want full TypeScript support or need fine-grained control (e.g. custom init options, programmatic event tracking from island components), install the npm package instead.

```bash
npm install swetrix
```

Create a client-side script that initialises Swetrix and add it to your layout.

**1. Create the analytics script**

Create `src/scripts/analytics.ts`:

```typescript
import * as Swetrix from 'swetrix'

Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()
```

**2. Include it in your layout**

Add the script to your base layout with the `client:load` directive via a `<script>` tag:

```html
---
// src/layouts/Layout.astro
export interface Props {
  title: string;
}

const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
    <script>
      import * as Swetrix from 'swetrix'

      Swetrix.init('YOUR_PROJECT_ID')
      Swetrix.trackViews()
    </script>
  </body>
</html>
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

:::tip
Astro processes `<script>` tags — they're bundled and deduplicated automatically. The script above will only be included once in the final build, even if the layout is used on every page.
:::

## View Transitions support

If you're using [Astro's View Transitions](https://docs.astro.build/en/guides/view-transitions/) for client-side navigation, no extra configuration is needed. Swetrix's `trackViews()` automatically detects route changes via the History API, so View Transition navigations are tracked out of the box.

### Noscript fallback (optional)

To track visitors who have JavaScript disabled, add a noscript image pixel to your layout's `<body>`:

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

By default, Swetrix ignores `localhost` traffic. If you want to be explicit about it, you can conditionally disable tracking in development.

**CDN script** — wrap the initialisation in a host check:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    var isDev = window.location.hostname === 'localhost'

    swetrix.init('YOUR_PROJECT_ID', { disabled: isDev })
    swetrix.trackViews()
  })
</script>
```

**npm package** — use `import.meta.env`:

```typescript
import * as Swetrix from 'swetrix'

Swetrix.init('YOUR_PROJECT_ID', {
  disabled: import.meta.env.DEV,
})
Swetrix.trackViews()
```

:::tip
If you want to verify tracking locally during development, set `devMode: true` instead:

```typescript
Swetrix.init('YOUR_PROJECT_ID', {
  devMode: true,
})
```

Remember to remove this before deploying to production.
:::

## Check your installation

Build and deploy your site (or temporarily enable `devMode`) and visit a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Error tracking

Enable automatic client-side error monitoring to capture unhandled JavaScript errors and report them to Swetrix.

**CDN script:**

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
    swetrix.trackErrors()
  })
</script>
```

**npm package:**

```typescript
import * as Swetrix from 'swetrix'

Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()
Swetrix.trackErrors()
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you track specific user interactions — button clicks, form submissions, downloads, and more.

### In Astro components

Use a `<script>` tag with client-side JavaScript to track events from `.astro` components:

```html
---
// src/components/DownloadButton.astro
---
<button id="download-btn">Download PDF</button>

<script>
  document.getElementById('download-btn')?.addEventListener('click', () => {
    if (window.swetrix) {
      swetrix.track({ ev: 'PDF_DOWNLOAD' })
    }
  })
</script>
```

If you're using the npm package, you can import it directly:

```html
---
// src/components/DownloadButton.astro
---
<button id="download-btn">Download PDF</button>

<script>
  import * as Swetrix from 'swetrix'

  document.getElementById('download-btn')?.addEventListener('click', () => {
    Swetrix.track({
      ev: 'PDF_DOWNLOAD',
      meta: { format: 'pdf' },
    })
  })
</script>
```

### In framework island components

If you're using [Astro islands](https://docs.astro.build/en/concepts/islands/) with React, Vue, Svelte, or another UI framework, you can track events from within those components. Just import the npm package and call `track()` as usual.

**React island example:**

```tsx
// src/components/SignUpForm.tsx
import * as Swetrix from 'swetrix'

export default function SignUpForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    Swetrix.track({
      ev: 'SIGNUP_FORM_SUBMITTED',
      meta: { source: 'landing_page' },
    })

    // ...submit logic
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="you@example.com" required />
      <button type="submit">Sign up</button>
    </form>
  )
}
```

Then use it in your Astro page with a `client:*` directive:

```html
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import SignUpForm from '../components/SignUpForm';
---

<Layout title="Home">
  <SignUpForm client:load />
</Layout>
```

### Event naming rules

Event names must:

- Contain only English letters (a-Z), numbers (0-9), underscores (`_`), and dots (`.`)
- Be fewer than 64 characters
- Start with an English letter

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `PDF_DOWNLOAD`, `SIGNUP_FORM_SUBMITTED`).

## Using environment variables for your Project ID

Rather than hardcoding your Project ID, you can use Astro's built-in environment variable support.

**1. Add to your `.env` file:**

```
PUBLIC_SWETRIX_PID=YOUR_PROJECT_ID
```

**2. Reference it in your analytics script** (npm package approach):

```typescript
import * as Swetrix from 'swetrix'

Swetrix.init(import.meta.env.PUBLIC_SWETRIX_PID)
Swetrix.trackViews()
```

Astro requires client-side environment variables to be prefixed with `PUBLIC_`.

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
- [Astro documentation](https://docs.astro.build/) — official Astro docs for layouts, View Transitions, islands, and more.
