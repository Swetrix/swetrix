---
title: Nuxt
slug: /nuxt-integration
---

Integrate Swetrix with your [Nuxt](https://nuxt.com/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

This guide covers **Nuxt 3**. For plain Vue apps without Nuxt, see the [Vue integration](/vue-integration) instead.

## Installation

Install the Swetrix npm package:

```bash
npm install swetrix
```

### Create a Swetrix plugin

Nuxt plugins run once when your app initialises, making them the ideal place to set up analytics. Create `plugins/swetrix.client.ts` (the `.client` suffix ensures it only runs in the browser):

```ts
import * as Swetrix from 'swetrix'

export default defineNuxtPlugin(() => {
  Swetrix.init('YOUR_PROJECT_ID')
  Swetrix.trackViews()
})
```

That's it — Nuxt auto-registers files in the `plugins/` directory. `trackViews()` automatically detects client-side route changes, so page views are tracked on every navigation.

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### Noscript fallback (optional)

To track visitors who have JavaScript disabled, add a noscript image pixel to your `app.vue` (or `app.html` if you have a custom HTML template):

```vue
<template>
  <div>
    <NuxtPage />

    <noscript>
      <img
        src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
        alt=""
        referrerpolicy="no-referrer-when-downgrade"
      />
    </noscript>
  </div>
</template>
```

## Disable tracking in development

By default, Swetrix ignores `localhost` traffic. If you want to be explicit about it, you can conditionally disable tracking based on your environment.

Update `plugins/swetrix.client.ts`:

```ts
import * as Swetrix from 'swetrix'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  Swetrix.init(config.public.swetrixPid, {
    disabled: process.dev,
  })
  Swetrix.trackViews()
})
```

:::tip
If you want to verify tracking locally during development, set `devMode: true` instead:

```ts
Swetrix.init('YOUR_PROJECT_ID', {
  devMode: true,
})
```

Remember to remove this before deploying to production.
:::

## Check your installation

Deploy your application (or temporarily enable `devMode`) and visit a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Error tracking

Enable automatic client-side error monitoring by adding `trackErrors()` to your plugin. This captures unhandled JavaScript errors and reports them to Swetrix.

Update `plugins/swetrix.client.ts`:

```ts
import * as Swetrix from 'swetrix'

export default defineNuxtPlugin(() => {
  Swetrix.init('YOUR_PROJECT_ID')
  Swetrix.trackViews()
  Swetrix.trackErrors()
})
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you track specific user interactions — button clicks, form submissions, sign-ups, purchases, and more. Import `swetrix` in any component and call `track()`.

### Example: tracking button clicks

```vue
<script setup lang="ts">
import * as Swetrix from 'swetrix'

function handleClick() {
  Swetrix.track({
    ev: 'SIGNUP_CTA_CLICK',
    meta: {
      location: 'navbar',
    },
  })
}
</script>

<template>
  <button @click="handleClick">Sign up</button>
</template>
```

### Example: tracking form submissions

```vue
<script setup lang="ts">
import * as Swetrix from 'swetrix'

function handleSubmit() {
  Swetrix.track({
    ev: 'CONTACT_FORM_SUBMITTED',
    meta: {
      source: 'support_page',
    },
  })

  // ...submit logic
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input type="email" placeholder="you@example.com" required />
    <textarea placeholder="How can we help?" required />
    <button type="submit">Send</button>
  </form>
</template>
```

### Example: tracking outbound links

Create a reusable component for external links. Save as `components/TrackedLink.vue`:

```vue
<script setup lang="ts">
import * as Swetrix from 'swetrix'

const props = withDefaults(
  defineProps<{
    href: string
    eventName?: string
  }>(),
  {
    eventName: 'OUTBOUND_CLICK',
  },
)

function handleClick() {
  Swetrix.track({
    ev: props.eventName,
    meta: { url: props.href },
  })
}
</script>

<template>
  <a :href="href" target="_blank" rel="noopener noreferrer" @click="handleClick">
    <slot />
  </a>
</template>
```

### Event naming rules

Event names must:

- Contain only English letters (a-Z), numbers (0-9), underscores (`_`), and dots (`.`)
- Be fewer than 64 characters
- Start with an English letter

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `SIGNUP_CTA_CLICK`, `CONTACT_FORM_SUBMITTED`).

## Using environment variables for your Project ID

Rather than hardcoding your Project ID, use Nuxt's [runtime config](https://nuxt.com/docs/guide/going-further/runtime-config).

**1. Add to your `nuxt.config.ts`:**

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      swetrixPid: '',
    },
  },
})
```

**2. Set the environment variable:**

```
NUXT_PUBLIC_SWETRIX_PID=YOUR_PROJECT_ID
```

**3. Reference it in your plugin:**

```ts
const config = useRuntimeConfig()
Swetrix.init(config.public.swetrixPid)
```

## Further reading

- [Vue integration](/vue-integration) — if you're using plain Vue without Nuxt, follow this guide instead.
- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
